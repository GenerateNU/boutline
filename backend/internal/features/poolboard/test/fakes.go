package test

import (
	"context"
	"fmt"
	"slices"

	"boutline/internal/errs"
	"boutline/internal/features/poolboard"

	"github.com/google/uuid"
)

var _ poolboard.PoolBoardRepository = (*FakePoolBoardRepository)(nil)

type FakePoolBoardRepository struct {
	Events  map[uuid.UUID][]poolboard.PoolBoardPoolRow // event id to its pools, already in board order
	Fencers []poolboard.PoolBoardFencerRow
	Bouts   []poolboard.PoolBoardBoutRow
	Err     error // when set, every method fails with it
}

func (f *FakePoolBoardRepository) ListPoolsByEventID(
	_ context.Context,
	filter poolboard.PoolBoardListFilter,
) ([]poolboard.PoolBoardPoolRow, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	pools := f.Events[filter.EventID]
	total := int64(len(pools))
	if filter.Offset >= len(pools) {
		return []poolboard.PoolBoardPoolRow{}, total, nil
	}

	pools = pools[filter.Offset:]
	if filter.Limit < len(pools) {
		pools = pools[:filter.Limit]
	}

	return pools, total, nil
}

func (f *FakePoolBoardRepository) GetPoolByID(_ context.Context, id uuid.UUID) (*poolboard.PoolBoardPoolRow, error) {
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

func (f *FakePoolBoardRepository) ListFencersByPoolIDs(
	_ context.Context,
	poolIDs []uuid.UUID,
) ([]poolboard.PoolBoardFencerRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var matched []poolboard.PoolBoardFencerRow
	for _, fencer := range f.Fencers {
		if slices.Contains(poolIDs, fencer.PoolID) {
			matched = append(matched, fencer)
		}
	}

	return matched, nil
}

func (f *FakePoolBoardRepository) ListBoutsByPoolIDs(
	_ context.Context,
	poolIDs []uuid.UUID,
) ([]poolboard.PoolBoardBoutRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var matched []poolboard.PoolBoardBoutRow
	for _, bout := range f.Bouts {
		if slices.Contains(poolIDs, bout.PoolID) {
			matched = append(matched, bout)
		}
	}

	return matched, nil
}
