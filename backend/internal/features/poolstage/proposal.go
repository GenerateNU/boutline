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

// proposedMaxPools is the most pools batch pool creation takes in one request.
const proposedMaxPools = 100

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
	if err := s.checkProposalStage(ctx, *stage); err != nil {
		return nil, errs.HumaError(err)
	}

	competitors, err := s.loadProposalCompetitors(ctx, *stage, competitorIDs)
	if err != nil {
		return nil, errs.HumaError(err)
	}
	maxPerPool := min(stage.MaxCompetitorPerPool, proposedPoolMaxFencers)
	if err := checkProposalSize(len(competitorIDs), maxPerPool); err != nil {
		return nil, errs.HumaError(err)
	}

	entries := make([]SeedEntry, 0, len(competitorIDs))
	for _, competitorID := range competitorIDs {
		competitor := competitors[competitorID]
		entries = append(entries, SeedEntry{CompetitorID: competitor.ID, Rating: competitor.Rating, Club: competitor.Team})
	}
	rng := rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64())) //nolint:gosec // a fair draw, not a secret
	pools, err := GenerateSeed(entries, maxPerPool, rng)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	return &PoolStageProposalOutput{Body: newPoolStageProposalResult(pools, competitors)}, nil
}

// checkProposalStage refuses a stage that isn't upcoming or already has pools. A proposal
// numbers its pools from 1, so creation would reject it next to existing pools; those are
// changed by re-seating instead.
func (s *poolStageService) checkProposalStage(ctx context.Context, stage PoolStage) error {
	if stage.Status != PoolStageStatusUpcoming {
		return errs.Public("pools can only be proposed for an upcoming pool stage", errs.ErrConflict)
	}

	total, _, err := s.repo.CountPoolStagePools(ctx, stage.ID)
	if err != nil {
		return fmt.Errorf("count pool stage pools: %w", err)
	}
	if total > 0 {
		return errs.Public("pools can only be proposed for a pool stage with no pools yet", errs.ErrConflict)
	}

	return nil
}

// checkProposalSize rejects a field that pool creation would refuse: one that cannot fill
// pools of MinCompetitorsPerPool to maxPerPool, or needs more pools than one request takes.
// Seeding makes the fewest pools that fit, which also has the largest smallest pool, so if
// that pool is too small no split works.
func checkProposalSize(count, maxPerPool int) error {
	pools := 1 + (count-1)/maxPerPool
	if count < pools*MinCompetitorsPerPool {
		return errs.Public(
			fmt.Sprintf("%d competitors cannot be split into pools of %d to %d fencers", count, MinCompetitorsPerPool, maxPerPool),
			errs.ErrInvalidInput)
	}
	if pools > proposedMaxPools {
		return errs.Public(
			fmt.Sprintf("%d competitors need %d pools of at most %d fencers, but at most %d pools can be created at once",
				count, pools, maxPerPool, proposedMaxPools),
			errs.ErrInvalidInput)
	}

	return nil
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

// loadProposalCompetitors returns every competitor by id after checking each exists and is
// entered in the stage's event, the rule pool creation applies, so a proposal can be
// created as is. The first failure is reported in request order.
func (s *poolStageService) loadProposalCompetitors(
	ctx context.Context,
	stage PoolStage,
	competitorIDs []uuid.UUID,
) (map[uuid.UUID]PoolStageCompetitor, error) {
	listed, err := s.repo.ListPoolStageCompetitors(ctx, competitorIDs)
	if err != nil {
		return nil, fmt.Errorf("list competitors: %w", err)
	}
	competitors := make(map[uuid.UUID]PoolStageCompetitor, len(listed))
	for _, competitor := range listed {
		competitors[competitor.ID] = competitor
	}

	for _, id := range competitorIDs {
		competitor, ok := competitors[id]
		if !ok {
			return nil, errs.Public(fmt.Sprintf("competitor %s does not exist", id), errs.ErrInvalidInput)
		}
		if competitor.EventID != stage.EventID {
			return nil, errs.Public(
				fmt.Sprintf("competitor %s is not entered in this pool stage's event", id), errs.ErrInvalidInput)
		}
	}

	return competitors, nil
}

func newPoolStageProposalResult(pools [][]uuid.UUID, competitors map[uuid.UUID]PoolStageCompetitor) PoolStageProposalResult {
	result := PoolStageProposalResult{Pools: make([]PoolStageProposedPool, 0, len(pools))}
	for i, ids := range pools {
		fencers := make([]PoolStageProposedFencer, 0, len(ids))
		for _, id := range ids {
			competitor := competitors[id]
			fencers = append(fencers, PoolStageProposedFencer{
				CompetitorID: competitor.ID.String(),
				FirstName:    competitor.FirstName,
				LastName:     competitor.LastName,
				Rating:       string(competitor.Rating),
				Team:         competitor.Team,
			})
		}
		result.Pools = append(result.Pools, PoolStageProposedPool{Number: i + 1, Fencers: fencers})
	}

	return result
}
