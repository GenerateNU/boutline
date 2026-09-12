// Package test holds the example feature's unit tests and the doubles they run
// against. Anything that needs the real app or a real database is an
// integration test and belongs in internal/tests instead.
package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/example"

	"github.com/google/uuid"
)

var _ example.ExampleRepository = (*FakeExampleRepository)(nil)

// FakeExampleRepository stands in for the gorm repository. It returns the same
// errs sentinels — including the unique-name conflict — so every branch the
// service can take is reachable without a database.
type FakeExampleRepository struct {
	Examples map[uuid.UUID]example.Example
	Err      error // when set, every method fails with it
}

func NewFakeExampleRepository(seed ...example.Example) *FakeExampleRepository {
	examples := make(map[uuid.UUID]example.Example, len(seed))
	for _, seeded := range seed {
		examples[seeded.ID] = seeded
	}

	return &FakeExampleRepository{Examples: examples}
}

func (f *FakeExampleRepository) CreateExample(_ context.Context, toCreate *example.Example) error {
	if f.Err != nil {
		return f.Err
	}

	for _, existing := range f.Examples {
		if existing.Name == toCreate.Name {
			return fmt.Errorf("insert example: %w", errs.ErrDuplicate)
		}
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Examples[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeExampleRepository) FindExampleByID(_ context.Context, id uuid.UUID) (*example.Example, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Examples[id]
	if !ok {
		return nil, fmt.Errorf("select example %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeExampleRepository) ListExamples(
	_ context.Context,
	filter example.ExampleListFilter,
) ([]example.Example, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]example.Example, 0, len(f.Examples))
	for _, candidate := range f.Examples {
		if filter.Status == "" || candidate.Status == filter.Status {
			matched = append(matched, candidate)
		}
	}

	// Ordered by name, not the repository's created_at, so that iterating a map
	// still yields the same page on every run.
	slices.SortFunc(matched, func(a, b example.Example) int {
		return strings.Compare(a.Name, b.Name)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []example.Example{}, total, nil
	}

	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakeExampleRepository) DeleteExample(_ context.Context, id uuid.UUID) error {
	if f.Err != nil {
		return f.Err
	}

	if _, ok := f.Examples[id]; !ok {
		return fmt.Errorf("soft delete example %s: %w", id, errs.ErrNotFound)
	}

	delete(f.Examples, id)

	return nil
}
