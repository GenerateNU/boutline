package test

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"
	"boutline/internal/features/tournamentuser"

	"github.com/google/uuid"
)

var _ directelimination.DrawRepository = (*fakeDrawRepository)(nil)

type fakeDrawRepository struct {
	locked       map[uuid.UUID]directelimination.LockedDirectElimination
	entries      []directelimination.DrawEntry
	bouts        []directelimination.DrawBout
	poolStage    *poolstage.PoolStage
	standFencers []pool.PoolSheetFencerRow
	standBouts   []pool.PoolSheetBoutRow
}

func (f *fakeDrawRepository) WithLockedDirectElimination(
	_ context.Context,
	id uuid.UUID,
	fn func(repo directelimination.DrawRepository, de directelimination.LockedDirectElimination) error,
) error {
	de, ok := f.locked[id]
	if !ok {
		return fmt.Errorf("lock direct elimination %s: %w", id, errs.ErrNotFound)
	}

	return fn(f, de)
}

func (f *fakeDrawRepository) CountDirectEliminationEntries(_ context.Context, id uuid.UUID) (int64, error) {
	var count int64
	for _, entry := range f.entries {
		if entry.DirectEliminationID == id {
			count++
		}
	}

	return count, nil
}

func (f *fakeDrawRepository) GetEventPoolStage(_ context.Context, eventID uuid.UUID) (*poolstage.PoolStage, error) {
	if f.poolStage == nil || f.poolStage.EventID != eventID {
		return nil, fmt.Errorf("select pool stage of event %s: %w", eventID, errs.ErrNotFound)
	}

	return f.poolStage, nil
}

func (f *fakeDrawRepository) ListPoolStageStandingRows(
	_ context.Context,
	_ uuid.UUID,
) ([]pool.PoolSheetFencerRow, []pool.PoolSheetBoutRow, error) {
	return f.standFencers, f.standBouts, nil
}

func (f *fakeDrawRepository) CreateDraw(
	_ context.Context,
	entries []directelimination.DrawEntry,
	bouts []directelimination.DrawBout,
) error {
	f.entries = append(f.entries, entries...)
	for i := range bouts {
		bouts[i].ID = uuid.New()
	}
	f.bouts = append(f.bouts, bouts...)

	return nil
}

type fakeMemberships []tournamentuser.TournamentUser

func (m fakeMemberships) GetTournamentUser(
	_ context.Context,
	tournamentID, userID uuid.UUID,
) (*tournamentuser.TournamentUser, error) {
	for _, membership := range m {
		if membership.TournamentID == tournamentID && membership.UserID == userID {
			return &membership, nil
		}
	}

	return nil, fmt.Errorf("select tournament user: %w", errs.ErrNotFound)
}
