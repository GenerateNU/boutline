package test

import (
	"context"
	"fmt"
	"maps"
	"slices"
	"strings"

	"boutline/internal/errs"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
)

var _ pool.PoolSheetRepository = (*FakePoolSheetRepository)(nil)

type FakePoolSheetRepository struct {
	Events  map[uuid.UUID][]pool.PoolSheetPoolRow // event id to its pools, already in sheet order
	Fencers []pool.PoolSheetFencerRow
	Bouts   []pool.PoolSheetBoutRow
	Err     error // when set, every method fails with it
}

func (f *FakePoolSheetRepository) ListPoolSheets(
	_ context.Context,
	filter pool.PoolSheetListFilter,
) ([]pool.PoolSheetPoolRow, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	var pools []pool.PoolSheetPoolRow
	for _, eventID := range slices.SortedFunc(maps.Keys(f.Events), func(a, b uuid.UUID) int {
		return strings.Compare(a.String(), b.String())
	}) {
		if filter.EventID != nil && eventID != *filter.EventID {
			continue
		}
		for _, row := range f.Events[eventID] {
			if len(filter.IDs) == 0 || slices.Contains(filter.IDs, row.ID) {
				pools = append(pools, row)
			}
		}
	}

	total := int64(len(pools))
	if filter.Offset >= len(pools) {
		return []pool.PoolSheetPoolRow{}, total, nil
	}

	pools = pools[filter.Offset:]
	if filter.Limit < len(pools) {
		pools = pools[:filter.Limit]
	}

	return pools, total, nil
}

// ReadSnapshot runs read directly: the fake has no concurrent writers to isolate from.
func (f *FakePoolSheetRepository) ReadSnapshot(_ context.Context, read func(repo pool.PoolSheetRepository) error) error {
	return read(f)
}

func (f *FakePoolSheetRepository) GetPoolSheetByID(_ context.Context, id uuid.UUID) (*pool.PoolSheetPoolRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	for _, pools := range f.Events {
		for _, candidate := range pools {
			if candidate.ID == id {
				return &candidate, nil
			}
		}
	}

	return nil, fmt.Errorf("select pool sheet %s: %w", id, errs.ErrNotFound)
}

func (f *FakePoolSheetRepository) ListPoolSheetFencers(
	_ context.Context,
	poolIDs []uuid.UUID,
) ([]pool.PoolSheetFencerRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var matched []pool.PoolSheetFencerRow
	for _, fencer := range f.Fencers {
		if slices.Contains(poolIDs, fencer.PoolID) {
			matched = append(matched, fencer)
		}
	}

	return matched, nil
}

func (f *FakePoolSheetRepository) ListPoolSheetBouts(
	_ context.Context,
	poolIDs []uuid.UUID,
) ([]pool.PoolSheetBoutRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var matched []pool.PoolSheetBoutRow
	for _, bout := range f.Bouts {
		if slices.Contains(poolIDs, bout.PoolID) {
			matched = append(matched, bout)
		}
	}

	return matched, nil
}
