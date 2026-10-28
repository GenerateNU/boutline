package poolstage

import (
	"context"
	"fmt"
	"math/rand/v2"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

// proposedPoolMaxFencers caps a proposed pool at the largest size batch pool creation
// accepts, the largest with a standard bout order, so every proposal can be created as is.
const proposedPoolMaxFencers = 10

// ProposePools splits the competitors into pools without saving anything. Rating years
// are not stored yet, so ties within a rating letter fall to the seeding's random draw.
func (s *poolStageService) ProposePools(ctx context.Context, input *PoolStageProposalInput) (*PoolStageProposalOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	competitorIDs, err := parseProposalCompetitors(input.Body.CompetitorIDs)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	stage, err := s.repo.GetPoolStageByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool stage: %w", err))
	}
	if stage.Status != PoolStageStatusUpcoming {
		return nil, errs.HumaError(errs.Public("pools can only be proposed for an upcoming pool stage", errs.ErrConflict))
	}

	entrants, err := s.loadProposalEntrants(ctx, *stage, competitorIDs)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	entries := make([]SeedEntry, 0, len(competitorIDs))
	for _, competitorID := range competitorIDs {
		entrant := entrants[competitorID]
		entries = append(entries, SeedEntry{CompetitorID: entrant.ID, Rating: entrant.Rating, Club: entrant.Team})
	}
	rng := rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64())) //nolint:gosec // a fair draw, not a secret
	pools, err := GenerateSeed(entries, min(stage.MaxCompetitorPerPool, proposedPoolMaxFencers), rng)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	return &PoolStageProposalOutput{Body: newPoolStageProposalResult(pools, entrants)}, nil
}

func parseProposalCompetitors(raw []string) ([]uuid.UUID, error) {
	ids := make([]uuid.UUID, 0, len(raw))
	seen := make(map[uuid.UUID]bool, len(raw))
	for _, value := range raw {
		id, err := utils.ParseUUID(value, "competitor_ids")
		if err != nil {
			return nil, err
		}
		if seen[id] {
			return nil, errs.Public(fmt.Sprintf("competitor %s is listed more than once", id), errs.ErrInvalidInput)
		}
		seen[id] = true
		ids = append(ids, id)
	}

	return ids, nil
}

// loadProposalEntrants returns every competitor by id after checking each exists and is
// entered in the stage's tournament; the first failure is reported in request order.
func (s *poolStageService) loadProposalEntrants(
	ctx context.Context,
	stage PoolStage,
	competitorIDs []uuid.UUID,
) (map[uuid.UUID]PoolStageEntrant, error) {
	event, err := s.events.GetEventByID(ctx, stage.EventID)
	if err != nil {
		return nil, fmt.Errorf("get pool stage event: %w", err)
	}

	listed, err := s.repo.ListPoolStageEntrants(ctx, competitorIDs)
	if err != nil {
		return nil, fmt.Errorf("list competitors: %w", err)
	}
	entrants := make(map[uuid.UUID]PoolStageEntrant, len(listed))
	for _, entrant := range listed {
		entrants[entrant.ID] = entrant
	}

	for _, id := range competitorIDs {
		entrant, ok := entrants[id]
		if !ok {
			return nil, errs.Public(fmt.Sprintf("competitor %s does not exist", id), errs.ErrInvalidInput)
		}
		if entrant.TournamentID == nil || *entrant.TournamentID != event.TournamentID {
			return nil, errs.Public(
				fmt.Sprintf("competitor %s is not entered in this pool stage's tournament", id), errs.ErrInvalidInput)
		}
	}

	return entrants, nil
}

func newPoolStageProposalResult(pools [][]uuid.UUID, entrants map[uuid.UUID]PoolStageEntrant) PoolStageProposalResult {
	result := PoolStageProposalResult{Pools: make([]PoolStageProposedPool, 0, len(pools))}
	for i, ids := range pools {
		fencers := make([]PoolStageProposedFencer, 0, len(ids))
		for _, id := range ids {
			entrant := entrants[id]
			fencers = append(fencers, PoolStageProposedFencer{
				CompetitorID: entrant.ID.String(),
				FirstName:    entrant.FirstName,
				LastName:     entrant.LastName,
				Rating:       string(entrant.Rating),
				Team:         entrant.Team,
			})
		}
		result.Pools = append(result.Pools, PoolStageProposedPool{Number: i + 1, Fencers: fencers})
	}

	return result
}
