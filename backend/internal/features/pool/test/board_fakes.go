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

var _ pool.PoolBoardRepository = (*FakePoolBoardRepository)(nil)

type FakePoolBoardRepository struct {
	Events  map[uuid.UUID][]pool.PoolBoardPoolRow // event id to its pools, already in board order
	Fencers []pool.PoolBoardFencerRow
	Bouts   []pool.PoolBoardBoutRow
	Err     error // when set, every method fails with it
}

func (f *FakePoolBoardRepository) ListPoolBoards(
	_ context.Context,
	filter pool.PoolBoardListFilter,
) ([]pool.PoolBoardPoolRow, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	var pools []pool.PoolBoardPoolRow
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
		return []pool.PoolBoardPoolRow{}, total, nil
	}

	pools = pools[filter.Offset:]
	if filter.Limit < len(pools) {
		pools = pools[:filter.Limit]
	}

	return pools, total, nil
}

func (f *FakePoolBoardRepository) GetPoolBoardByID(_ context.Context, id uuid.UUID) (*pool.PoolBoardPoolRow, error) {
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

	return nil, fmt.Errorf("select pool board %s: %w", id, errs.ErrNotFound)
}

func (f *FakePoolBoardRepository) ListPoolBoardFencers(
	_ context.Context,
	poolIDs []uuid.UUID,
) ([]pool.PoolBoardFencerRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var matched []pool.PoolBoardFencerRow
	for _, fencer := range f.Fencers {
		if slices.Contains(poolIDs, fencer.PoolID) {
			matched = append(matched, fencer)
		}
	}

	return matched, nil
}

func (f *FakePoolBoardRepository) ListPoolBoardBouts(
	_ context.Context,
	poolIDs []uuid.UUID,
) ([]pool.PoolBoardBoutRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var matched []pool.PoolBoardBoutRow
	for _, bout := range f.Bouts {
		if slices.Contains(poolIDs, bout.PoolID) {
			matched = append(matched, bout)
		}
	}

	return matched, nil
}
