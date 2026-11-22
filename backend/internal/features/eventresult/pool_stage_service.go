package eventresult

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

type PoolStageResultService interface {
	ListPoolStageResults(ctx context.Context, input *PoolStageResultListInput) (*PoolStageResultListOutput, error)
}

type poolStageResultService struct {
	repo   EventResultRepository
	events EventLookup
}

func NewPoolStageResultService(repo EventResultRepository, events EventLookup) PoolStageResultService {
	return &poolStageResultService{repo: repo, events: events}
}

func (s *poolStageResultService) ListPoolStageResults(
	ctx context.Context,
	input *PoolStageResultListInput,
) (*PoolStageResultListOutput, error) {
	eventID, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	limit := utils.Clamp(input.Limit, EventResultMinPageSize, EventResultMaxPageSize)
	if input.Limit <= 0 {
		limit = EventResultDefaultPageSize
	}
	offset := max(input.Offset, 0)

	if _, err := s.events.GetEventByID(ctx, eventID); err != nil {
		return nil, errs.HumaError(fmt.Errorf("get event: %w", err))
	}

	rows, err := s.rankLatestPoolStage(ctx, eventID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	end := min(offset+limit, len(rows))
	page := rows[min(offset, end):end]
	data := make([]PoolStageResultResponse, 0, len(page))
	for _, row := range page {
		data = append(data, newPoolStageResultResponse(row))
	}

	return &PoolStageResultListOutput{Body: PoolStageResultListBody{
		Data: data, Total: int64(len(rows)), Limit: limit, Offset: offset,
	}}, nil
}

// Unlike the final classification, this ranks a pool stage that is still running.
// An event without a pool stage has no results rather than a missing resource.
func (s *poolStageResultService) rankLatestPoolStage(ctx context.Context, eventID uuid.UUID) ([]PoolStageResultRow, error) {
	stage, err := s.repo.GetLatestPoolStage(ctx, eventID)
	if errors.Is(err, errs.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get pool stage: %w", err)
	}

	fencers, err := s.repo.ListPoolStageResultFencers(ctx, stage.ID)
	if err != nil {
		return nil, fmt.Errorf("list pool stage fencers: %w", err)
	}
	bouts, err := s.repo.ListPoolStageBouts(ctx, stage.ID)
	if err != nil {
		return nil, fmt.Errorf("list pool stage bouts: %w", err)
	}
	entrants, err := s.listTableauEntrants(ctx, eventID)
	if err != nil {
		return nil, err
	}

	return rankPoolStageResults(fencers, bouts, entrants), nil
}

func (s *poolStageResultService) listTableauEntrants(
	ctx context.Context,
	eventID uuid.UUID,
) ([]directelimination.DirectEliminationEntrant, error) {
	elimination, err := s.repo.GetLatestDirectElimination(ctx, eventID)
	if errors.Is(err, errs.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get direct elimination: %w", err)
	}

	entrants, err := s.repo.ListDirectEliminationEntrants(ctx, elimination.ID)
	if err != nil {
		return nil, fmt.Errorf("list direct elimination entrants: %w", err)
	}

	return entrants, nil
}
