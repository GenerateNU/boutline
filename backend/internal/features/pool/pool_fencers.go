package pool

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/poolstage"
	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

var errPoolReseatForbidden = errs.Public("only the tournament's admins can re-seat its pools", errs.ErrForbidden)

// A pool with no bouts to copy from falls back to batch create's defaults.
const (
	poolDefaultPointsToWin      = 5
	poolDefaultTimeLimitSeconds = 180
)

// reseatPool replaces a pool's fencers and regenerates its bouts, applying any other
// fields in the same patch so the new bouts carry the pool's updated strip, referee
// and number. Every check runs under the stage lock, as in create, so two re-seats
// can't seat the same fencer in two pools.
func (s *poolService) reseatPool(ctx context.Context, id uuid.UUID, update PoolUpdate, rawFencers []string) (*PoolOutput, error) {
	fencers, err := parseFencers(rawFencers)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	stored, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool: %w", err))
	}
	if err := s.authorizeReseat(ctx, id); err != nil {
		return nil, errs.HumaError(fmt.Errorf("reseat pool: %w", err))
	}

	err = s.repo.WithLockedPoolStage(ctx, stored.PoolStageID, func(repo PoolRepository, stage LockedPoolStage) error {
		return reseatLockedPool(ctx, repo, stage, id, update, fencers)
	})
	if errors.Is(err, errPoolSeatingLocked) {
		err = errs.Public(msgPoolFencersLocked, errs.ErrConflict)
	}
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("reseat pool: %w", err))
	}

	pool, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated pool: %w", err))
	}

	return &PoolOutput{Body: newPoolResponse(*pool)}, nil
}

// authorizeReseat allows only an admin of the pool's tournament. It runs before the
// stage lock, since a read on another connection while holding it can starve the pool.
func (s *poolService) authorizeReseat(ctx context.Context, poolID uuid.UUID) error {
	caller, ok := user.UserIDFrom(ctx)
	if !ok {
		return errPoolReseatForbidden
	}
	tournamentID, err := s.repo.GetPoolTournamentID(ctx, poolID)
	if err != nil {
		return fmt.Errorf("get pool tournament: %w", err)
	}

	membership, err := s.memberships.GetTournamentUser(ctx, tournamentID, caller)
	if errors.Is(err, errs.ErrNotFound) {
		return errPoolReseatForbidden
	}
	if err != nil {
		return fmt.Errorf("get tournament user: %w", err)
	}
	if membership.Role != tournamentuser.TournamentUserRoleAdmin {
		return errPoolReseatForbidden
	}

	return nil
}

// reseatLockedPool checks and re-seats the pool through repo, which holds the stage lock.
func reseatLockedPool(
	ctx context.Context,
	repo PoolRepository,
	stage LockedPoolStage,
	id uuid.UUID,
	update PoolUpdate,
	fencers []uuid.UUID,
) error {
	if stage.TournamentStatus != tournament.TournamentStatusActive {
		return errs.Public("pools can only be re-seated in an active tournament", errs.ErrConflict)
	}
	if stage.Status != poolstage.PoolStageStatusUpcoming {
		return errs.Public("pools can only be re-seated in an upcoming pool stage", errs.ErrConflict)
	}
	current, summary, err := loadReseatablePool(ctx, repo, id)
	if err != nil {
		return err
	}

	requests := []poolRequest{{pool: applyPoolUpdate(*current, update), fencers: fencers}}
	if err := checkNoRepeatedCompetitor(requests); err != nil {
		return err
	}
	if err := checkFencerCounts(requests, min(stage.MaxCompetitorPerPool, poolMaxFencers)); err != nil {
		return err
	}
	if err := checkEntrants(ctx, repo, current.PoolStageID, stage.EventID, id, requests); err != nil {
		return err
	}

	pointsToWin, timeLimitSeconds := poolDefaultPointsToWin, poolDefaultTimeLimitSeconds
	if summary.Total > 0 {
		pointsToWin, timeLimitSeconds = summary.PointsToWin, summary.TimeLimitSeconds
	}
	lineup := newPoolLineup(requests[0].pool, fencers, stage.TournamentID, pointsToWin, timeLimitSeconds)

	return repo.ReplacePoolBouts(ctx, id, update, lineup.Bouts)
}

// loadReseatablePool returns the pool and its bout summary, refusing a pool that has
// started or has a bout that isn't upcoming, so no fenced touch is lost, and one whose
// bouts disagree on their rules, so none is silently changed.
func loadReseatablePool(ctx context.Context, repo PoolRepository, id uuid.UUID) (*Pool, PoolBoutSummary, error) {
	current, err := repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, PoolBoutSummary{}, fmt.Errorf("get pool: %w", err)
	}
	if current.StartedAt != nil {
		return nil, PoolBoutSummary{}, errs.Public(msgPoolFencersLocked, errs.ErrConflict)
	}

	summary, err := repo.GetPoolBoutSummary(ctx, id)
	if err != nil {
		return nil, PoolBoutSummary{}, fmt.Errorf("summarise pool bouts: %w", err)
	}
	if summary.Started > 0 {
		return nil, PoolBoutSummary{}, errs.Public(msgPoolFencersLocked, errs.ErrConflict)
	}
	// The new bouts all take one set of rules, so a pool with several has no rules to keep.
	if summary.RuleSets > 1 {
		return nil, PoolBoutSummary{}, errs.Public(msgPoolMixedRules, errs.ErrConflict)
	}

	return current, summary, nil
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
