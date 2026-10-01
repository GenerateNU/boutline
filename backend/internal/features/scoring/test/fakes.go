package test

import (
	"context"
	"fmt"
	"slices"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/scoring"
)

var _ scoring.ScoringRepository = (*FakeScoringRepository)(nil)

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
) ([]scoring.Scoring, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	matched := make([]scoring.Scoring, 0, len(f.Scores))
	for _, candidate := range f.Scores {
		if candidate.MatchID != filter.MatchID {
			continue
		}
		if !filter.IncludeRevoked && candidate.RevokedAt != nil {
			continue
		}
		matched = append(matched, candidate)
	}

	slices.SortFunc(matched, func(a, b scoring.Scoring) int {
		if c := a.CreatedAt.Compare(b.CreatedAt); c != 0 {
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

	return matched, nil
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
	stored.RevokedAt = updated.RevokedAt
	stored.RevokedBy = updated.RevokedBy
	stored.UpdatedAt = time.Now()
	f.Scores[updated.ID] = stored

	return nil
}
