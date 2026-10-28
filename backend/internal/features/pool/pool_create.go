package pool

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/poolstage"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

// poolRequest is one requested pool with its ids parsed, in request order.
type poolRequest struct {
	pool    Pool
	fencers []uuid.UUID
}

func parsePoolRequests(items []PoolCreateItem) ([]poolRequest, error) {
	if len(items) == 0 {
		return nil, errs.Public("provide at least one pool", errs.ErrInvalidInput)
	}

	requests := make([]poolRequest, 0, len(items))
	for _, item := range items {
		request, err := parsePoolRequest(item)
		if err != nil {
			return nil, err
		}
		requests = append(requests, request)
	}

	if err := checkSharedStage(requests); err != nil {
		return nil, err
	}

	return requests, checkNoRepeatedCompetitor(requests)
}

func parsePoolRequest(item PoolCreateItem) (poolRequest, error) {
	stageID, err := utils.ParseUUID(item.PoolStageID, "pool_stage_id")
	if err != nil {
		return poolRequest{}, err
	}
	refereeID, err := parseOptionalUUID(item.RefereeID, "referee_id")
	if err != nil {
		return poolRequest{}, err
	}

	fencers, err := parseFencers(item.Fencers)
	if err != nil {
		return poolRequest{}, err
	}

	return poolRequest{
		pool: Pool{
			PoolStageID: stageID,
			RefereeID:   refereeID,
			Number:      item.Number,
			Strip:       item.Strip,
			StartTime:   item.StartTime,
		},
		fencers: fencers,
	}, nil
}

func parseFencers(raw []string) ([]uuid.UUID, error) {
	fencers := make([]uuid.UUID, 0, len(raw))
	for _, value := range raw {
		id, err := utils.ParseUUID(value, "fencers")
		if err != nil {
			return nil, err
		}
		fencers = append(fencers, id)
	}

	return fencers, nil
}

func checkSharedStage(requests []poolRequest) error {
	for _, request := range requests[1:] {
		if request.pool.PoolStageID != requests[0].pool.PoolStageID {
			return errs.Public("every pool must belong to the same pool stage", errs.ErrInvalidInput)
		}
	}

	return nil
}

func checkNoRepeatedCompetitor(requests []poolRequest) error {
	seen := make(map[uuid.UUID]bool)
	for _, request := range requests {
		for _, id := range request.fencers {
			if seen[id] {
				return errs.Public(fmt.Sprintf("competitor %s is listed more than once", id), errs.ErrInvalidInput)
			}
			seen[id] = true
		}
	}

	return nil
}

func (s *poolService) requireUpcomingPoolStage(ctx context.Context, id uuid.UUID) (*poolstage.PoolStage, error) {
	stage, err := s.poolStages.GetPoolStageByID(ctx, id)
	if err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			return nil, errs.Public("pool_stage_id must reference an existing pool stage", errs.ErrInvalidInput)
		}
		return nil, fmt.Errorf("get pool stage: %w", err)
	}
	if stage.Status != poolstage.PoolStageStatusUpcoming {
		return nil, errs.Public("pools can only be created in an upcoming pool stage", errs.ErrConflict)
	}

	return stage, nil
}

func checkFencerCounts(requests []poolRequest, limit int) error {
	for _, request := range requests {
		if n := len(request.fencers); n < 2 || n > limit {
			return errs.Public(
				fmt.Sprintf("pool %d must have between 2 and %d fencers", request.pool.Number, limit),
				errs.ErrInvalidInput)
		}
	}

	return nil
}

// loadEntrants returns every requested competitor by id, after checking each exists and
// none is already seated in a pool of the stage other than exceptPoolID (uuid.Nil for none).
func (s *poolService) loadEntrants(
	ctx context.Context,
	stageID uuid.UUID,
	requests []poolRequest,
	exceptPoolID uuid.UUID,
) (map[uuid.UUID]PoolEntrant, error) {
	var requested []uuid.UUID
	for _, request := range requests {
		requested = append(requested, request.fencers...)
	}

	listed, err := s.repo.ListPoolEntrants(ctx, requested)
	if err != nil {
		return nil, fmt.Errorf("list competitors: %w", err)
	}
	entrants := make(map[uuid.UUID]PoolEntrant, len(listed))
	for _, entrant := range listed {
		entrants[entrant.ID] = entrant
	}
	for _, id := range requested {
		if _, ok := entrants[id]; !ok {
			return nil, errs.Public(fmt.Sprintf("competitor %s does not exist", id), errs.ErrInvalidInput)
		}
	}

	entered, err := s.repo.ListEnteredCompetitorIDs(ctx, stageID, requested, exceptPoolID)
	if err != nil {
		return nil, fmt.Errorf("list entered competitors: %w", err)
	}
	taken := make(map[uuid.UUID]bool, len(entered))
	for _, id := range entered {
		taken[id] = true
	}
	for _, id := range requested {
		if taken[id] {
			return nil, errs.Public(
				fmt.Sprintf("competitor %s is already in a pool of this pool stage", id), errs.ErrConflict)
		}
	}

	return entrants, nil
}
