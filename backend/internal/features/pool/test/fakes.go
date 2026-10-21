package test

import (
	"context"
	"fmt"
	"slices"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"

	"github.com/google/uuid"
)

var _ pool.PoolRepository = (*FakePoolRepository)(nil)

type FakePoolRepository struct {
	Pools       map[uuid.UUID]pool.Pool
	WithBouts   map[uuid.UUID]bool      // pools the real database would refuse to delete
	Tournaments map[uuid.UUID]uuid.UUID // pool id to the tournament its stage's event belongs to
	OpenBouts   map[uuid.UUID]int64     // pool id to its bouts that have not ended
	Err         error                   // when set, every method fails with it
}

func NewFakePoolRepository(seed ...pool.Pool) *FakePoolRepository {
	pools := make(map[uuid.UUID]pool.Pool, len(seed))
	for _, seeded := range seed {
		pools[seeded.ID] = seeded
	}

	return &FakePoolRepository{
		Pools:       pools,
		WithBouts:   map[uuid.UUID]bool{},
		Tournaments: map[uuid.UUID]uuid.UUID{},
		OpenBouts:   map[uuid.UUID]int64{},
	}
}

func (f *FakePoolRepository) CreatePool(_ context.Context, toCreate *pool.Pool) error {
	if f.Err != nil {
		return f.Err
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Pools[toCreate.ID] = *toCreate

	return nil
}

func (f *FakePoolRepository) GetPoolByID(_ context.Context, id uuid.UUID) (*pool.Pool, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Pools[id]
	if !ok {
		return nil, fmt.Errorf("select pool %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakePoolRepository) GetPoolTournamentID(_ context.Context, id uuid.UUID) (uuid.UUID, error) {
	if f.Err != nil {
		return uuid.Nil, f.Err
	}

	tournamentID, ok := f.Tournaments[id]
	if !ok {
		return uuid.Nil, fmt.Errorf("select pool %s tournament: %w", id, errs.ErrNotFound)
	}

	return tournamentID, nil
}

func (f *FakePoolRepository) ListPools(
	_ context.Context,
	filter pool.PoolListFilter,
) ([]pool.Pool, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]pool.Pool, 0, len(f.Pools))
	for _, candidate := range f.Pools {
		if filter.PoolStageID != nil && candidate.PoolStageID != *filter.PoolStageID {
			continue
		}
		matched = append(matched, candidate)
	}

	slices.SortFunc(matched, func(a, b pool.Pool) int {
		return b.CreatedAt.Compare(a.CreatedAt)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []pool.Pool{}, total, nil
	}

	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakePoolRepository) UpdatePoolByID(_ context.Context, id uuid.UUID, update pool.PoolUpdate) error {
	if f.Err != nil {
		return f.Err
	}

	stored, ok := f.Pools[id]
	if !ok {
		return fmt.Errorf("select pool %s: %w", id, errs.ErrNotFound)
	}

	if update.RefereeID != nil {
		stored.RefereeID = update.RefereeID
	}
	stored.UpdatedAt = time.Now()
	f.Pools[id] = stored

	return nil
}

func (f *FakePoolRepository) StartPoolByID(_ context.Context, id uuid.UUID, startedAt time.Time) error {
	return f.stamp(id, func(p *pool.Pool) bool {
		if p.StartedAt != nil {
			return false
		}
		p.StartedAt = &startedAt

		return true
	})
}

func (f *FakePoolRepository) EndPoolByID(_ context.Context, id uuid.UUID, completedAt time.Time) error {
	return f.stamp(id, func(p *pool.Pool) bool {
		if p.StartedAt == nil || p.CompletedAt != nil {
			return false
		}
		p.CompletedAt = &completedAt

		return true
	})
}

func (f *FakePoolRepository) stamp(id uuid.UUID, apply func(*pool.Pool) bool) error {
	if f.Err != nil {
		return f.Err
	}

	stored, ok := f.Pools[id]
	if !ok {
		return fmt.Errorf("select pool %s: %w", id, errs.ErrNotFound)
	}
	if !apply(&stored) {
		return fmt.Errorf("update pool %s: %w", id, errs.ErrConflict)
	}

	stored.UpdatedAt = time.Now()
	f.Pools[id] = stored

	return nil
}

func (f *FakePoolRepository) CountOpenPoolBouts(_ context.Context, id uuid.UUID) (int64, error) {
	if f.Err != nil {
		return 0, f.Err
	}

	return f.OpenBouts[id], nil
}

func (f *FakePoolRepository) DeletePoolByID(_ context.Context, id uuid.UUID) error {
	if f.Err != nil {
		return f.Err
	}

	if _, ok := f.Pools[id]; !ok {
		return fmt.Errorf("delete pool %s: %w", id, errs.ErrNotFound)
	}
	if f.WithBouts[id] {
		return fmt.Errorf("delete pool %s: %w", id,
			errs.Public("a pool with bouts cannot be deleted", errs.ErrConflict))
	}

	delete(f.Pools, id)

	return nil
}

var _ pool.PoolStageLookup = (*FakePoolStageLookup)(nil)

type FakePoolStageLookup struct {
	PoolStages map[uuid.UUID]poolstage.PoolStage
	Err        error
}

func NewFakePoolStageLookup(seed ...poolstage.PoolStage) *FakePoolStageLookup {
	poolStages := make(map[uuid.UUID]poolstage.PoolStage, len(seed))
	for _, seeded := range seed {
		poolStages[seeded.ID] = seeded
	}

	return &FakePoolStageLookup{PoolStages: poolStages}
}

func (f *FakePoolStageLookup) GetPoolStageByID(_ context.Context, id uuid.UUID) (*poolstage.PoolStage, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.PoolStages[id]
	if !ok {
		return nil, fmt.Errorf("select pool stage %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}
