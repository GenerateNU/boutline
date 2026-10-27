package pool

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/poolstage"

	"github.com/google/uuid"
)

// A pool that has no bouts to copy from falls back to the FIE pool standard.
const (
	poolDefaultPointsToWin      = 5
	poolDefaultTimeLimitSeconds = 180
)

// reseatPool replaces a pool's fencers and regenerates its bouts, applying any other
// fields in the same patch so the new bouts carry the pool's updated strip, referee
// and number. Nothing has been fenced yet, so nothing is lost.
func (s *poolService) reseatPool(ctx context.Context, id uuid.UUID, update PoolUpdate, rawFencers []string) (*PoolOutput, error) {
	fencers, err := parseFencers(rawFencers)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	stored, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool: %w", err))
	}
	summary, stage, err := s.requireReseatablePool(ctx, *stored)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	lineup, err := s.newReseatLineup(ctx, applyPoolUpdate(*stored, update), fencers, summary, stage)
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if err := s.repo.ReplacePoolBouts(ctx, id, update, lineup.Bouts); err != nil {
		return nil, errs.HumaError(fmt.Errorf("reseat pool: %w", err))
	}

	pool, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated pool: %w", err))
	}

	return &PoolOutput{Body: newPoolResponse(*pool)}, nil
}

func (s *poolService) requireReseatablePool(ctx context.Context, stored Pool) (PoolBoutSummary, *poolstage.PoolStage, error) {
	if stored.StartedAt != nil {
		return PoolBoutSummary{}, nil, errs.Public(msgPoolFencersLocked, errs.ErrConflict)
	}
	summary, err := s.repo.GetPoolBoutSummary(ctx, stored.ID)
	if err != nil {
		return PoolBoutSummary{}, nil, fmt.Errorf("summarise pool bouts: %w", err)
	}
	if summary.Started > 0 {
		return PoolBoutSummary{}, nil, errs.Public(msgPoolFencersLocked, errs.ErrConflict)
	}

	stage, err := s.poolStages.GetPoolStageByID(ctx, stored.PoolStageID)
	if err != nil {
		return PoolBoutSummary{}, nil, fmt.Errorf("get pool stage: %w", err)
	}

	return summary, stage, nil
}

// newReseatLineup validates the new fencers the way batch create does, except that
// fencers already in this pool may stay, and keeps the pool's bout rules.
func (s *poolService) newReseatLineup(
	ctx context.Context,
	pool Pool,
	fencers []uuid.UUID,
	summary PoolBoutSummary,
	stage *poolstage.PoolStage,
) (PoolLineup, error) {
	requests := []poolRequest{{pool: pool, fencers: fencers}}
	if err := checkNoRepeatedCompetitor(requests); err != nil {
		return PoolLineup{}, err
	}
	if err := checkFencerCounts(requests, min(stage.MaxCompetitorPerPool, poolMaxFencers)); err != nil {
		return PoolLineup{}, err
	}

	entrants, err := s.loadEntrants(ctx, pool.PoolStageID, requests, pool.ID)
	if err != nil {
		return PoolLineup{}, err
	}
	tournamentID, err := s.repo.GetPoolTournamentID(ctx, pool.ID)
	if err != nil {
		return PoolLineup{}, fmt.Errorf("get pool tournament: %w", err)
	}

	pointsToWin, timeLimitSeconds := poolDefaultPointsToWin, poolDefaultTimeLimitSeconds
	if summary.Total > 0 {
		pointsToWin, timeLimitSeconds = summary.PointsToWin, summary.TimeLimitSeconds
	}

	seated := make([]PoolEntrant, 0, len(fencers))
	for _, id := range fencers {
		seated = append(seated, entrants[id])
	}

	return newPoolLineup(pool, seated, tournamentID, pointsToWin, timeLimitSeconds), nil
}

func applyPoolUpdate(pool Pool, update PoolUpdate) Pool {
	if update.RefereeID != nil {
		pool.RefereeID = update.RefereeID
	}
	if update.Number != nil {
		pool.Number = *update.Number
	}
	if update.Strip != nil {
		pool.Strip = update.Strip
	}
	if update.StartTime != nil {
		pool.StartTime = update.StartTime
	}

	return pool
}
