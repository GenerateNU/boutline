package poolstage

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/event"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	PoolStageMinPageSize     = 1
	PoolStageDefaultPageSize = 20
	PoolStageMaxPageSize     = 100

	minCompetitorsPerPool = 2

	msgOnlyUpcomingCanStart = "only an upcoming pool stage can be started"
	msgOnlyActiveCanEnd     = "only an active pool stage can be ended"
)

// EventLookup is the subset of the EventRepository interface needed here.
type EventLookup interface {
	GetEventByID(ctx context.Context, id uuid.UUID) (*event.Event, error)
}

type PoolStageService interface {
	CreatePoolStage(ctx context.Context, input *PoolStageCreateInput) (*PoolStageOutput, error)
	GetPoolStageByID(ctx context.Context, input *PoolStageIDInput) (*PoolStageOutput, error)
	ListPoolStages(ctx context.Context, input *PoolStageListInput) (*PoolStageListOutput, error)
	UpdatePoolStageByID(ctx context.Context, input *PoolStageUpdateInput) (*PoolStageOutput, error)
	StartPoolStage(ctx context.Context, input *PoolStageIDInput) (*PoolStageOutput, error)
	EndPoolStage(ctx context.Context, input *PoolStageIDInput) (*PoolStageOutput, error)
	DeletePoolStageByID(ctx context.Context, input *PoolStageIDInput) (*struct{}, error)
}

type poolStageService struct {
	repo   PoolStageRepository
	events EventLookup
}

func NewPoolStageService(repo PoolStageRepository, events EventLookup) PoolStageService {
	return &poolStageService{repo: repo, events: events}
}

func errMaxCompetitorPerPoolTooSmall() error {
	return errs.Public(
		fmt.Sprintf("max_competitor_per_pool must be at least %d", minCompetitorsPerPool), errs.ErrInvalidInput)
}

func (s *poolStageService) CreatePoolStage(
	ctx context.Context,
	input *PoolStageCreateInput,
) (*PoolStageOutput, error) {
	eventID, err := utils.ParseUUID(input.Body.EventID, "event_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if input.Body.MaxCompetitorPerPool < minCompetitorsPerPool {
		return nil, errs.HumaError(errMaxCompetitorPerPoolTooSmall())
	}

	if _, err := s.events.GetEventByID(ctx, eventID); err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			return nil, errs.HumaError(errs.Public(
				"event_id must reference an existing event", errs.ErrInvalidInput))
		}
		return nil, errs.HumaError(fmt.Errorf("get event: %w", err))
	}

	stage := &PoolStage{
		EventID:              eventID,
		MaxCompetitorPerPool: input.Body.MaxCompetitorPerPool,
		Status:               PoolStageStatusUpcoming,
		StartTime:            input.Body.StartTime,
	}
	if err := s.repo.CreatePoolStage(ctx, stage); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create pool stage: %w", err))
	}

	return &PoolStageOutput{Body: newPoolStageResponse(*stage)}, nil
}

func (s *poolStageService) GetPoolStageByID(
	ctx context.Context,
	input *PoolStageIDInput,
) (*PoolStageOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	stage, err := s.repo.GetPoolStageByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool stage: %w", err))
	}

	return &PoolStageOutput{Body: newPoolStageResponse(*stage)}, nil
}

func (s *poolStageService) ListPoolStages(
	ctx context.Context,
	input *PoolStageListInput,
) (*PoolStageListOutput, error) {
	if input.Status != "" && !input.Status.IsValid() {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("unknown status %q", input.Status), errs.ErrInvalidInput))
	}

	var eventID *uuid.UUID
	if input.EventID != "" {
		id, err := utils.ParseUUID(input.EventID, "event_id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		eventID = &id
	}

	limit := input.Limit
	if limit <= 0 {
		limit = PoolStageDefaultPageSize
	}
	limit = utils.Clamp(limit, PoolStageMinPageSize, PoolStageMaxPageSize)
	offset := max(input.Offset, 0)

	stages, total, err := s.repo.ListPoolStages(ctx, PoolStageListFilter{
		EventID: eventID,
		Status:  input.Status,
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list pool stages: %w", err))
	}

	data := make([]PoolStageResponse, 0, len(stages))
	for _, listed := range stages {
		data = append(data, newPoolStageResponse(listed))
	}

	return &PoolStageListOutput{Body: PoolStageListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *poolStageService) UpdatePoolStageByID(
	ctx context.Context,
	input *PoolStageUpdateInput,
) (*PoolStageOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	body := input.Body
	if body.MaxCompetitorPerPool == nil && body.StartTime == nil {
		return nil, errs.HumaError(errs.Public("provide at least one field to update", errs.ErrInvalidInput))
	}
	if body.MaxCompetitorPerPool != nil && *body.MaxCompetitorPerPool < minCompetitorsPerPool {
		return nil, errs.HumaError(errMaxCompetitorPerPoolTooSmall())
	}

	err = s.repo.UpdatePoolStageByID(ctx, id, PoolStageUpdate(body))

	return s.updateResponse(ctx, id, err, "only an upcoming pool stage can be edited")
}

func (s *poolStageService) StartPoolStage(
	ctx context.Context,
	input *PoolStageIDInput,
) (*PoolStageOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	stage, err := s.repo.GetPoolStageByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool stage: %w", err))
	}
	if stage.Status != PoolStageStatusUpcoming {
		return nil, errs.HumaError(errs.Public(msgOnlyUpcomingCanStart, errs.ErrConflict))
	}

	total, _, err := s.repo.CountPoolStagePools(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("count pool stage pools: %w", err))
	}
	if total == 0 {
		return nil, errs.HumaError(errs.Public(
			"a pool stage needs at least one pool before it can start", errs.ErrConflict))
	}

	now := time.Now().UTC()
	err = s.repo.TransitionPoolStageByID(ctx, id, PoolStageTransition{
		To:        PoolStageStatusActive,
		StartedAt: &now,
		From:      []PoolStageStatus{PoolStageStatusUpcoming},
	})

	return s.updateResponse(ctx, id, err, msgOnlyUpcomingCanStart)
}

func (s *poolStageService) EndPoolStage(
	ctx context.Context,
	input *PoolStageIDInput,
) (*PoolStageOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	stage, err := s.repo.GetPoolStageByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool stage: %w", err))
	}
	if stage.Status != PoolStageStatusActive {
		return nil, errs.HumaError(errs.Public(msgOnlyActiveCanEnd, errs.ErrConflict))
	}

	_, open, err := s.repo.CountPoolStagePools(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("count pool stage pools: %w", err))
	}
	if open > 0 {
		return nil, errs.HumaError(errs.Public(
			"every pool must end before the pool stage can end", errs.ErrConflict))
	}

	now := time.Now().UTC()
	err = s.repo.TransitionPoolStageByID(ctx, id, PoolStageTransition{
		To:          PoolStageStatusEnded,
		CompletedAt: &now,
		From:        []PoolStageStatus{PoolStageStatusActive},
	})

	return s.updateResponse(ctx, id, err, msgOnlyActiveCanEnd)
}

func (s *poolStageService) updateResponse(
	ctx context.Context,
	id uuid.UUID,
	err error,
	conflictMessage string,
) (*PoolStageOutput, error) {
	if err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("update pool stage: %w",
				errs.Public(conflictMessage, err)))
		}

		return nil, errs.HumaError(fmt.Errorf("update pool stage: %w", err))
	}

	stage, err := s.repo.GetPoolStageByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated pool stage: %w", err))
	}

	return &PoolStageOutput{Body: newPoolStageResponse(*stage)}, nil
}

func (s *poolStageService) DeletePoolStageByID(ctx context.Context, input *PoolStageIDInput) (*struct{}, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeletePoolStageByID(ctx, id); err != nil {
		// A conflict that already carries its own public message (pools with
		// bouts) must not be overwritten by the generic status one.
		if errors.Is(err, errs.ErrConflict) && errs.ClientMessage(err) == errs.ErrConflict.Error() {
			return nil, errs.HumaError(fmt.Errorf("delete pool stage: %w",
				errs.Public("only an upcoming pool stage can be deleted", err)))
		}
		return nil, errs.HumaError(fmt.Errorf("delete pool stage: %w", err))
	}

	return nil, nil
}
