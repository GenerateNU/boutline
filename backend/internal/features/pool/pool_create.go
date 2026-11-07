package pool

import (
	"context"
	"fmt"

	"boutline/internal/errs"
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

	fencers := make([]uuid.UUID, 0, len(item.Fencers))
	for _, raw := range item.Fencers {
		id, err := utils.ParseUUID(raw, "fencers")
		if err != nil {
			return poolRequest{}, err
		}
		fencers = append(fencers, id)
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

// checkEntrants checks that every requested competitor exists, is entered in the
// stage's event, and is not already seated in a pool of the stage.
func checkEntrants(ctx context.Context, repo PoolRepository, stageID, eventID uuid.UUID, requests []poolRequest) error {
	var requested []uuid.UUID
	for _, request := range requests {
		requested = append(requested, request.fencers...)
	}

	listed, err := repo.ListPoolEntrants(ctx, requested)
	if err != nil {
		return fmt.Errorf("list competitors: %w", err)
	}
	entrants := make(map[uuid.UUID]PoolEntrant, len(listed))
	for _, entrant := range listed {
		entrants[entrant.ID] = entrant
	}
	for _, id := range requested {
		entrant, ok := entrants[id]
		if !ok {
			return errs.Public(fmt.Sprintf("competitor %s does not exist", id), errs.ErrInvalidInput)
		}
		if entrant.EventID != eventID {
			return errs.Public(fmt.Sprintf("competitor %s is not entered in this pool stage's event", id), errs.ErrInvalidInput)
		}
	}

	entered, err := repo.ListEnteredCompetitorIDs(ctx, stageID, requested)
	if err != nil {
		return fmt.Errorf("list entered competitors: %w", err)
	}
	taken := make(map[uuid.UUID]bool, len(entered))
	for _, id := range entered {
		taken[id] = true
	}
	for _, id := range requested {
		if taken[id] {
			return errs.Public(
				fmt.Sprintf("competitor %s is already in a pool of this pool stage", id), errs.ErrConflict)
		}
	}

	return nil
}
