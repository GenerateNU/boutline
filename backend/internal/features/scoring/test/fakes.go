package test

import (
	"cmp"
	"context"
	"fmt"
	"slices"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/bout"
	"boutline/internal/features/scoring"

	"github.com/google/uuid"
)

var (
	_ scoring.ScoringRepository = (*FakeScoringRepository)(nil)
	_ scoring.BoutLookup        = (*FakeBoutLookup)(nil)
)

type FakeBoutLookup struct {
	Bouts map[uuid.UUID]bout.Bout
	Err   error // when set, every lookup fails with it
}

func NewFakeBoutLookup(seed ...bout.Bout) *FakeBoutLookup {
	bouts := make(map[uuid.UUID]bout.Bout, len(seed))
	for _, seeded := range seed {
		bouts[seeded.ID] = seeded
	}

	return &FakeBoutLookup{Bouts: bouts}
}

func (f *FakeBoutLookup) GetBoutByID(_ context.Context, id uuid.UUID) (*bout.Bout, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Bouts[id]
	if !ok {
		return nil, fmt.Errorf("select bout %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

type FakeScoringRepository struct {
	Scores map[int64]scoring.Scoring
	Err    error // when set, every method fails with it
	nextID int64
}

func NewFakeScoringRepository(seed ...scoring.Scoring) *FakeScoringRepository {
	scores := make(map[int64]scoring.Scoring, len(seed))
	var maxID int64
	for _, seeded := range seed {
		scores[seeded.ID] = seeded
		if seeded.ID > maxID {
			maxID = seeded.ID
		}
	}

	return &FakeScoringRepository{Scores: scores, nextID: maxID + 1}
}

func (f *FakeScoringRepository) CreateScoring(_ context.Context, toCreate *scoring.Scoring) error {
	if f.Err != nil {
		return f.Err
	}

	toCreate.ID = f.nextID
	f.nextID++
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Scores[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeScoringRepository) GetScoringByID(_ context.Context, id int64) (*scoring.Scoring, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Scores[id]
	if !ok {
		return nil, fmt.Errorf("select scoring %d: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeScoringRepository) ListScoring(
	_ context.Context,
	filter scoring.ScoringListFilter,
) ([]scoring.Scoring, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]scoring.Scoring, 0, len(f.Scores))
	for _, candidate := range f.Scores {
		if filter.BoutID != nil && candidate.BoutID != *filter.BoutID {
			continue
		}
		if !filter.IncludeRevoked && candidate.RevokedAt != nil {
			continue
		}
		matched = append(matched, candidate)
	}

	slices.SortFunc(matched, func(a, b scoring.Scoring) int {
		if c := b.CreatedAt.Compare(a.CreatedAt); c != 0 {
			return c
		}
		switch {
		case a.ID < b.ID:
			return -1
		case a.ID > b.ID:
			return 1
		}
		return 0
	})

	total := int64(len(matched))
	if filter.Offset > 0 {
		if filter.Offset >= len(matched) {
			return []scoring.Scoring{}, total, nil
		}
		matched = matched[filter.Offset:]
	}
	if filter.Limit > 0 && filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakeScoringRepository) UpdateScoring(_ context.Context, updated *scoring.Scoring) error {
	if f.Err != nil {
		return f.Err
	}

	stored, ok := f.Scores[updated.ID]
	if !ok {
		return fmt.Errorf("update scoring %d: %w", updated.ID, errs.ErrNotFound)
	}

	if stored.RevokedAt != nil {
		return fmt.Errorf("update scoring %d: %w", updated.ID, errs.ErrConflict)
	}

	stored.Points = updated.Points
	stored.CompetitorID = updated.CompetitorID
	stored.UpdatedAt = time.Now()
	f.Scores[updated.ID] = stored

	return nil
}

func (f *FakeScoringRepository) RevokeScoring(_ context.Context, revoked *scoring.Scoring) error {
	if f.Err != nil {
		return f.Err
	}

	stored, ok := f.Scores[revoked.ID]
	if !ok {
		return fmt.Errorf("revoke scoring %d: %w", revoked.ID, errs.ErrNotFound)
	}

	if stored.RevokedAt != nil {
		return fmt.Errorf("revoke scoring %d: %w", revoked.ID, errs.ErrConflict)
	}

	now := time.Now()
	if revoked.RevokedAt == nil {
		revoked.RevokedAt = &now
	}

	stored.RevokedAt = revoked.RevokedAt
	stored.RevokedBy = revoked.RevokedBy
	stored.UpdatedAt = now
	f.Scores[revoked.ID] = stored

	return nil
}

func (f *FakeScoringRepository) ListScoringHistory(_ context.Context, boutID uuid.UUID) ([]scoring.Scoring, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	scores := []scoring.Scoring{}
	for _, candidate := range f.Scores {
		if candidate.BoutID == boutID {
			scores = append(scores, candidate)
		}
	}
	slices.SortFunc(scores, func(a, b scoring.Scoring) int {
		if c := b.CreatedAt.Compare(a.CreatedAt); c != 0 {
			return c
		}

		return cmp.Compare(b.ID, a.ID)
	})

	return scores, nil
}
