package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"

	"github.com/google/uuid"
)

var _ directelimination.DirectEliminationRepository = (*FakeDirectEliminationRepository)(nil)

type FakeDirectEliminationRepository struct {
	DirectEliminations map[uuid.UUID]directelimination.DirectElimination
	Err                error // when set, every method fails with it
}

func NewFakeDirectEliminationRepository(
	seed ...directelimination.DirectElimination,
) *FakeDirectEliminationRepository {
	rounds := make(map[uuid.UUID]directelimination.DirectElimination, len(seed))
	for _, seeded := range seed {
		rounds[seeded.ID] = seeded
	}

	return &FakeDirectEliminationRepository{DirectEliminations: rounds}
}

func (f *FakeDirectEliminationRepository) CreateDirectElimination(
	_ context.Context,
	toCreate *directelimination.DirectElimination,
) error {
	if f.Err != nil {
		return f.Err
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.DirectEliminations[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeDirectEliminationRepository) GetDirectEliminationByID(
	_ context.Context,
	id uuid.UUID,
) (*directelimination.DirectElimination, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.DirectEliminations[id]
	if !ok {
		return nil, fmt.Errorf("select direct elimination %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeDirectEliminationRepository) ListDirectElimination(
	_ context.Context,
	filter directelimination.DirectEliminationListFilter,
) ([]directelimination.DirectElimination, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	matched := make([]directelimination.DirectElimination, 0, len(f.DirectEliminations))
	for _, candidate := range f.DirectEliminations {
		if filter.EventID != nil && candidate.EventID != *filter.EventID {
			continue
		}
		if filter.Status != nil && candidate.Status != *filter.Status {
			continue
		}
		matched = append(matched, candidate)
	}

	// Newest first, like the real repository; ID breaks ties so order is stable.
	slices.SortFunc(matched, func(a, b directelimination.DirectElimination) int {
		if c := b.CreatedAt.Compare(a.CreatedAt); c != 0 {
			return c
		}
		return strings.Compare(a.ID.String(), b.ID.String())
	})

	return matched, nil
}

func (f *FakeDirectEliminationRepository) EditDirectEliminationByID(
	_ context.Context,
	id uuid.UUID,
	edit directelimination.DirectEliminationEdit,
) error {
	stored, err := f.guard(id, directelimination.DirectEliminationEditableStatuses())
	if err != nil {
		return err
	}

	if edit.EventID != nil {
		stored.EventID = *edit.EventID
	}

	f.save(id, stored)

	return nil
}

func (f *FakeDirectEliminationRepository) TransitionDirectEliminationByID(
	_ context.Context,
	id uuid.UUID,
	transition directelimination.DirectEliminationTransition,
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

func (f *FakeDirectEliminationRepository) DeleteDirectElimination(
	_ context.Context,
	id uuid.UUID,
) error {
	if f.Err != nil {
		return f.Err
	}

	if _, ok := f.DirectEliminations[id]; !ok {
		return fmt.Errorf("delete direct elimination %s: %w", id, errs.ErrNotFound)
	}

	delete(f.DirectEliminations, id)

	return nil
}

func (f *FakeDirectEliminationRepository) guard(
	id uuid.UUID,
	allowedStatuses []directelimination.Status,
) (directelimination.DirectElimination, error) {
	if f.Err != nil {
		return directelimination.DirectElimination{}, f.Err
	}

	stored, ok := f.DirectEliminations[id]
	if !ok {
		return directelimination.DirectElimination{},
			fmt.Errorf("update direct elimination %s: %w", id, errs.ErrNotFound)
	}

	if len(allowedStatuses) > 0 && !slices.Contains(allowedStatuses, stored.Status) {
		return directelimination.DirectElimination{},
			fmt.Errorf("update direct elimination %s: %w", id, errs.ErrConflict)
	}

	return stored, nil
}

func (f *FakeDirectEliminationRepository) save(id uuid.UUID, stored directelimination.DirectElimination) {
	stored.UpdatedAt = time.Now()
	f.DirectEliminations[id] = stored
}
