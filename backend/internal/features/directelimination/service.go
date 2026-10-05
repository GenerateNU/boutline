package directelimination

import (
	"context"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/utils"
)

type DirectEliminationService interface {
	CreateDirectElimination(ctx context.Context, input *DirectEliminationCreateInput) (*DirectEliminationOutput, error)
	GetDirectEliminationByID(ctx context.Context, input *DirectEliminationIDInput) (*DirectEliminationOutput, error)
	ListDirectElimination(ctx context.Context, input *DirectEliminationListInput) (*DirectEliminationListOutput, error)
	UpdateDirectEliminationByID(ctx context.Context, input *DirectEliminationUpdateInput) (*DirectEliminationOutput, error)
	DeleteDirectEliminationByID(ctx context.Context, input *DirectEliminationIDInput) error
	MarkAsStarted(ctx context.Context, input *DirectEliminationIDInput) (*DirectEliminationOutput, error)
	MarkAsCompleted(ctx context.Context, input *DirectEliminationIDInput) (*DirectEliminationOutput, error)
}

type directEliminationService struct {
	repo DirectEliminationRepository
}

func NewDirectEliminationService(repo DirectEliminationRepository) DirectEliminationService {
	return &directEliminationService{repo: repo}
}

// getEditable loads a round and rejects the request if it has already ended.
// Every mutating method goes through this so ended rounds are read-only.
func (s *directEliminationService) getEditable(
	ctx context.Context,
	id string,
) (*DirectElimination, error) {
	parsed, err := utils.ParseUUID(id, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	de, err := s.repo.GetDirectEliminationByID(ctx, parsed)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get direct elimination: %w", err))
	}

	if de.Status == StatusEnd {
		return nil, errs.HumaError(errs.Public(
			"direct elimination round has ended and can no longer be modified", errs.ErrConflict))
	}

	return de, nil
}

func (s *directEliminationService) CreateDirectElimination(
	ctx context.Context,
	input *DirectEliminationCreateInput,
) (*DirectEliminationOutput, error) {
	eventID, err := utils.ParseUUID(input.Body.EventID, "event_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	// New rounds always begin as upcoming; use MarkAsStarted to begin one.
	de := &DirectElimination{
		EventID: eventID,
		Status:  StatusUpcoming,
	}

	if err := s.repo.CreateDirectElimination(ctx, de); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create direct elimination: %w", err))
	}

	return &DirectEliminationOutput{Body: newDirectEliminationResponse(*de)}, nil
}

func (s *directEliminationService) GetDirectEliminationByID(
	ctx context.Context,
	input *DirectEliminationIDInput,
) (*DirectEliminationOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	de, err := s.repo.GetDirectEliminationByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get direct elimination: %w", err))
	}

	return &DirectEliminationOutput{Body: newDirectEliminationResponse(*de)}, nil
}

func (s *directEliminationService) ListDirectElimination(
	ctx context.Context,
	input *DirectEliminationListInput,
) (*DirectEliminationListOutput, error) {
	filter := DirectEliminationListFilter{}

	if input.EventID != "" {
		eventID, err := utils.ParseUUID(input.EventID, "event_id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		filter.EventID = &eventID
	}

	if input.Status != "" {
		status := input.Status
		filter.Status = &status
	}

	rounds, err := s.repo.ListDirectElimination(ctx, filter)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list direct elimination: %w", err))
	}

	data := make([]DirectEliminationResponse, 0, len(rounds))
	for _, listed := range rounds {
		data = append(data, newDirectEliminationResponse(listed))
	}

	return &DirectEliminationListOutput{Body: DirectEliminationListBody{
		Data:  data,
		Total: int64(len(data)),
	}}, nil
}

func (s *directEliminationService) UpdateDirectEliminationByID(
	ctx context.Context,
	input *DirectEliminationUpdateInput,
) (*DirectEliminationOutput, error) {
	if input.Body.EventID == nil {
		return nil, errs.HumaError(errs.Public("no fields to update", errs.ErrInvalidInput))
	}

	de, err := s.getEditable(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	eventID, err := utils.ParseUUID(*input.Body.EventID, "event_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	de.EventID = eventID

	if err := s.repo.UpdateDirectElimination(ctx, de); err != nil {
		return nil, errs.HumaError(fmt.Errorf("update direct elimination: %w", err))
	}

	return &DirectEliminationOutput{Body: newDirectEliminationResponse(*de)}, nil
}

func (s *directEliminationService) DeleteDirectEliminationByID(
	ctx context.Context,
	input *DirectEliminationIDInput,
) error {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return errs.HumaError(err)
	}

	if err := s.repo.DeleteDirectElimination(ctx, id); err != nil {
		return errs.HumaError(fmt.Errorf("delete direct elimination: %w", err))
	}

	return nil
}

func (s *directEliminationService) MarkAsStarted(
	ctx context.Context,
	input *DirectEliminationIDInput,
) (*DirectEliminationOutput, error) {
	de, err := s.getEditable(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	if de.Status != StatusUpcoming {
		return nil, errs.HumaError(errs.Public(
			"direct elimination round has already started", errs.ErrConflict))
	}

	now := time.Now()
	de.Status = StatusActive
	de.StartedAt = &now

	if err := s.repo.UpdateDirectElimination(ctx, de); err != nil {
		return nil, errs.HumaError(fmt.Errorf("mark direct elimination started: %w", err))
	}

	return &DirectEliminationOutput{Body: newDirectEliminationResponse(*de)}, nil
}

func (s *directEliminationService) MarkAsCompleted(
	ctx context.Context,
	input *DirectEliminationIDInput,
) (*DirectEliminationOutput, error) {
	de, err := s.getEditable(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	if de.Status != StatusActive {
		return nil, errs.HumaError(errs.Public(
			"direct elimination round must be active before it can be completed", errs.ErrConflict))
	}

	now := time.Now()
	de.Status = StatusEnd
	de.CompletedAt = &now

	if err := s.repo.UpdateDirectElimination(ctx, de); err != nil {
		return nil, errs.HumaError(fmt.Errorf("mark direct elimination completed: %w", err))
	}

	return &DirectEliminationOutput{Body: newDirectEliminationResponse(*de)}, nil
}
