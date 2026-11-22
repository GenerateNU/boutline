package poolstageresult

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/event"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

// EventLookup is the subset of the EventRepository interface needed here.
type EventLookup interface {
	GetEventByID(ctx context.Context, id uuid.UUID) (*event.Event, error)
}

type PoolStageResultService interface {
	ListPoolStageResults(ctx context.Context, input *PoolStageResultListInput) (*PoolStageResultListOutput, error)
}

type poolStageResultService struct {
	repo   PoolStageResultRepository
	events EventLookup
}

func NewPoolStageResultService(repo PoolStageResultRepository, events EventLookup) PoolStageResultService {
	return &poolStageResultService{repo: repo, events: events}
}

func (s *poolStageResultService) ListPoolStageResults(ctx context.Context, input *PoolStageResultListInput) (*PoolStageResultListOutput, error) {
	eventID, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	limit := utils.Clamp(input.Limit, PoolStageResultMinPageSize, PoolStageResultMaxPageSize)
	if input.Limit <= 0 {
		limit = PoolStageResultDefaultPageSize
	}
	offset := max(input.Offset, 0)

	if _, err := s.events.GetEventByID(ctx, eventID); err != nil {
		return nil, errs.HumaError(fmt.Errorf("get event: %w", err))
	}

	rows, err := s.listRankedPoolStageResults(ctx, eventID)
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

// An event without a pool stage has no pool stage results rather than a missing resource.
func (s *poolStageResultService) listRankedPoolStageResults(ctx context.Context, eventID uuid.UUID) ([]PoolStageResultRow, error) {
	stageID, err := s.repo.GetLatestPoolStageID(ctx, eventID)
	if errors.Is(err, errs.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get pool stage: %w", err)
	}

	fencers, err := s.repo.ListPoolStageResultFencers(ctx, stageID)
	if err != nil {
		return nil, fmt.Errorf("list pool stage fencers: %w", err)
	}
	bouts, err := s.repo.ListPoolStageBouts(ctx, stageID)
	if err != nil {
		return nil, fmt.Errorf("list pool stage bouts: %w", err)
	}
	entrantIDs, err := s.repo.ListTableauEntrantIDs(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("list tableau entrants: %w", err)
	}

	return rankPoolStageResults(fencers, bouts, entrantIDs), nil
}
