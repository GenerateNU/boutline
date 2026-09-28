package test

import (
	"context"
	"fmt"
	"slices"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/bout"
	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

var _ bout.BoutRepository = (*FakeBoutRepository)(nil)

type FakeBoutRepository struct {
	Bouts map[uuid.UUID]bout.Bout
	Err   error // when set, every method fails with it
}

func NewFakeBoutRepository(seed ...bout.Bout) *FakeBoutRepository {
	bouts := make(map[uuid.UUID]bout.Bout, len(seed))
	for _, seeded := range seed {
		bouts[seeded.ID] = seeded
	}

	return &FakeBoutRepository{Bouts: bouts}
}

func (f *FakeBoutRepository) CreateBout(_ context.Context, toCreate *bout.Bout) error {
	if f.Err != nil {
		return f.Err
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Bouts[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeBoutRepository) GetBoutByID(_ context.Context, id uuid.UUID) (*bout.Bout, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Bouts[id]
	if !ok {
		return nil, fmt.Errorf("select bout %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeBoutRepository) ListBouts(
	_ context.Context,
	filter bout.BoutListFilter,
) ([]bout.Bout, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]bout.Bout, 0, len(f.Bouts))
	for _, candidate := range f.Bouts {
		if filter.TournamentID != nil && candidate.TournamentID != *filter.TournamentID {
			continue
		}
		if filter.Status != "" && candidate.Status != filter.Status {
			continue
		}
		matched = append(matched, candidate)
	}

	slices.SortFunc(matched, func(a, b bout.Bout) int {
		return b.CreatedAt.Compare(a.CreatedAt)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []bout.Bout{}, total, nil
	}

	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakeBoutRepository) EditBoutByID(_ context.Context, id uuid.UUID, edit bout.BoutEdit) error {
	stored, err := f.guard(id, bout.BoutEditableStatuses())
	if err != nil {
		return err
	}

	if edit.Location != nil {
		stored.Location = edit.Location
	}
	if edit.StartTime != nil {
		stored.StartTime = edit.StartTime
	}
	if edit.RefereeID != nil {
		stored.RefereeID = edit.RefereeID
	}
	if edit.TimeLimitSeconds != nil {
		stored.TimeLimitSeconds = edit.TimeLimitSeconds
	}
	if edit.PointsToWin != nil {
		stored.PointsToWin = *edit.PointsToWin
	}
	if edit.GroupNumber != nil {
		stored.GroupNumber = *edit.GroupNumber
	}
	if edit.Competitor1ID != nil {
		stored.Competitor1ID = *edit.Competitor1ID
	}
	if edit.Competitor2ID != nil {
		stored.Competitor2ID = *edit.Competitor2ID
	}

	f.save(id, stored)

	return nil
}

func (f *FakeBoutRepository) TransitionBoutByID(
	_ context.Context,
	id uuid.UUID,
	transition bout.BoutTransition,
) error {
	stored, err := f.guard(id, transition.From)
	if err != nil {
		return err
	}

	stored.Status = transition.To
	if transition.StartedAt != nil {
		stored.StartedAt = transition.StartedAt
	}
	if transition.CompletedAt != nil {
		stored.CompletedAt = transition.CompletedAt
	}

	f.save(id, stored)

	return nil
}

func (f *FakeBoutRepository) DeleteBoutByID(_ context.Context, id uuid.UUID) error {
	if _, err := f.guard(id, bout.BoutDeletableStatuses()); err != nil {
		return err
	}

	delete(f.Bouts, id)

	return nil
}

func (f *FakeBoutRepository) guard(id uuid.UUID, allowedStatuses []bout.BoutStatus) (bout.Bout, error) {
	if f.Err != nil {
		return bout.Bout{}, f.Err
	}

	stored, ok := f.Bouts[id]
	if !ok {
		return bout.Bout{}, fmt.Errorf("update bout %s: %w", id, errs.ErrNotFound)
	}

	if len(allowedStatuses) > 0 && !slices.Contains(allowedStatuses, stored.Status) {
		return bout.Bout{}, fmt.Errorf("update bout %s: %w", id, errs.ErrConflict)
	}

	return stored, nil
}

func (f *FakeBoutRepository) save(id uuid.UUID, stored bout.Bout) {
	stored.UpdatedAt = time.Now()
	f.Bouts[id] = stored
}

var _ bout.TournamentLookup = (*FakeTournamentLookup)(nil)

type FakeTournamentLookup struct {
	Tournaments map[uuid.UUID]tournament.Tournament
	Err         error
}

func NewFakeTournamentLookup(seed ...tournament.Tournament) *FakeTournamentLookup {
	tournaments := make(map[uuid.UUID]tournament.Tournament, len(seed))
	for _, seeded := range seed {
		tournaments[seeded.ID] = seeded
	}

	return &FakeTournamentLookup{Tournaments: tournaments}
}

func (f *FakeTournamentLookup) GetTournamentByID(_ context.Context, id uuid.UUID) (*tournament.Tournament, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Tournaments[id]
	if !ok {
		return nil, fmt.Errorf("select tournament %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}
