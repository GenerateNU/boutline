package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/competitor"

	"github.com/google/uuid"
)

var _ competitor.CompetitorRepository = (*FakeCompetitorRepository)(nil)

type FakeCompetitorRepository struct {
	Competitors map[uuid.UUID]competitor.Competitor
	Err         error // when set, every method fails with it
}

func NewFakeCompetitorRepository(seed ...competitor.Competitor) *FakeCompetitorRepository {
	competitors := make(map[uuid.UUID]competitor.Competitor, len(seed))
	for _, seeded := range seed {
		competitors[seeded.ID] = seeded
	}
	return &FakeCompetitorRepository{Competitors: competitors}
}

func (f *FakeCompetitorRepository) CreateCompetitor(_ context.Context, toCreate *competitor.Competitor) error {
	if f.Err != nil {
		return f.Err
	}
	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Competitors[toCreate.ID] = *toCreate
	return nil
}

func (f *FakeCompetitorRepository) GetCompetitorByID(
	_ context.Context,
	id uuid.UUID,
) (*competitor.Competitor, error) {
	if f.Err != nil {
		return nil, f.Err
	}
	found, ok := f.Competitors[id]
	if !ok {
		return nil, fmt.Errorf("select competitor %s: %w", id, errs.ErrNotFound)
	}
	return &found, nil
}

func (f *FakeCompetitorRepository) ListCompetitors(
	_ context.Context,
	filter competitor.CompetitorListFilter,
) ([]competitor.Competitor, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}
	matched := make([]competitor.Competitor, 0, len(f.Competitors))
	for _, candidate := range f.Competitors {
		matched = append(matched, candidate)
	}
	// Ordered by last name rather than created_at, so iterating a map still
	// yields the same page on every run. No tiebreaker is needed because the
	// seeded data has unique last names.
	slices.SortFunc(matched, func(a, b competitor.Competitor) int {
		return strings.Compare(a.LastName, b.LastName)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []competitor.Competitor{}, total, nil
	}
	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}
	return matched, total, nil
}

func (f *FakeCompetitorRepository) UpdateCompetitorByID(
	_ context.Context,
	id uuid.UUID,
	update competitor.CompetitorUpdate,
) error {
	if f.Err != nil {
		return f.Err
	}
	stored, ok := f.Competitors[id]
	if !ok {
		return fmt.Errorf("update competitor %s: %w", id, errs.ErrNotFound)
	}
	if update.FirstName != nil {
		stored.FirstName = *update.FirstName
	}
	if update.LastName != nil {
		stored.LastName = *update.LastName
	}
	if update.Rating != nil {
		stored.Rating = *update.Rating
	}
	if update.Team != nil {
		stored.Team = *update.Team
	}
	stored.UpdatedAt = time.Now()
	f.Competitors[id] = stored
	return nil
}

func (f *FakeCompetitorRepository) DeleteCompetitor(_ context.Context, id uuid.UUID) error {
	if f.Err != nil {
		return f.Err
	}
	if _, ok := f.Competitors[id]; !ok {
		return fmt.Errorf("delete competitor %s: %w", id, errs.ErrNotFound)
	}
	delete(f.Competitors, id)
	return nil
}
