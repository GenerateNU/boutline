package poolresult

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

type PoolResultService interface {
	ListPoolResults(ctx context.Context, input *PoolResultListInput) (*PoolResultListOutput, error)
}

type poolResultService struct {
	repo   PoolResultRepository
	events EventLookup
}

func NewPoolResultService(repo PoolResultRepository, events EventLookup) PoolResultService {
	return &poolResultService{repo: repo, events: events}
}

func (s *poolResultService) ListPoolResults(ctx context.Context, input *PoolResultListInput) (*PoolResultListOutput, error) {
	eventID, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	limit := utils.Clamp(input.Limit, PoolResultMinPageSize, PoolResultMaxPageSize)
	if input.Limit <= 0 {
		limit = PoolResultDefaultPageSize
	}
	offset := max(input.Offset, 0)

	if _, err := s.events.GetEventByID(ctx, eventID); err != nil {
		return nil, errs.HumaError(fmt.Errorf("get event: %w", err))
	}

	rows, err := s.listRankedPoolResults(ctx, eventID)
	if err != nil {
		return nil, errs.HumaError(err)
	}
	rows = filterPoolResults(rows, input.Q)

	end := min(offset+limit, len(rows))
	page := rows[min(offset, end):end]
	data := make([]PoolResultResponse, 0, len(page))
	for _, row := range page {
		data = append(data, newPoolResultResponse(row))
	}

	return &PoolResultListOutput{Body: PoolResultListBody{
		Data: data, Total: int64(len(rows)), Limit: limit, Offset: offset,
	}}, nil
}

// An event without a pool stage has no pool results rather than a missing resource.
func (s *poolResultService) listRankedPoolResults(ctx context.Context, eventID uuid.UUID) ([]PoolResultRow, error) {
	stageID, err := s.repo.GetLatestPoolStageID(ctx, eventID)
	if errors.Is(err, errs.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get pool stage: %w", err)
	}

	fencers, err := s.repo.ListPoolResultFencers(ctx, stageID)
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

	return rankPoolResults(fencers, bouts, entrantIDs), nil
}
