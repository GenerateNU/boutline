package test

import (
	"context"
	"fmt"
	"slices"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"
	"boutline/internal/features/tournamentuser"
	tournamentusertest "boutline/internal/features/tournamentuser/test"
	"boutline/internal/session"

	"github.com/google/uuid"
)

var (
	TestTournamentID = uuid.New()
	TestAdminID      = uuid.New()
	TestRefereeID    = uuid.New()
)

// NewTestMemberships seeds an admin and a referee of TestTournamentID.
func NewTestMemberships() *tournamentusertest.FakeMembershipLookup {
	return tournamentusertest.NewFakeMembershipLookup(
		tournamentuser.TournamentUser{
			UserID: TestAdminID, TournamentID: TestTournamentID, Role: tournamentuser.TournamentUserRoleAdmin,
		},
		tournamentuser.TournamentUser{
			UserID: TestRefereeID, TournamentID: TestTournamentID, Role: tournamentuser.TournamentUserRoleReferee,
		},
	)
}

// Caller picks who a request runs as; the zero value is the tournament admin.
type Caller int

const (
	CallerAdmin Caller = iota
	CallerNone
	CallerStranger
	CallerReferee
)

func (c Caller) Context(ctx context.Context) context.Context {
	switch c {
	case CallerNone:
		return ctx
	case CallerStranger:
		return session.WithUserID(ctx, uuid.New())
	case CallerReferee:
		return session.WithUserID(ctx, TestRefereeID)
	default:
		return session.WithUserID(ctx, TestAdminID)
	}
}

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
	tournaments := make(map[uuid.UUID]uuid.UUID, len(seed))
	for _, seeded := range seed {
		pools[seeded.ID] = seeded
		tournaments[seeded.ID] = TestTournamentID
	}

	return &FakePoolRepository{
		Pools:       pools,
		WithBouts:   map[uuid.UUID]bool{},
		Tournaments: tournaments,
		OpenBouts:   map[uuid.UUID]int64{},
	}
}

func (f *FakePoolRepository) CreatePool(_ context.Context, toCreate *pool.Pool) error {
	if f.Err != nil {
		return f.Err
	}

	if f.numberTaken(toCreate.PoolStageID, toCreate.Number, uuid.Nil) {
		return fmt.Errorf("create pool: %w", errDuplicateNumber())
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Pools[toCreate.ID] = *toCreate

	return nil
}

// numberTaken mirrors the unique index on (pool_stage_id, number); except is the
// pool being updated, which may keep its own number.
func (f *FakePoolRepository) numberTaken(poolStageID uuid.UUID, number int, except uuid.UUID) bool {
	for id, existing := range f.Pools {
		if id != except && existing.PoolStageID == poolStageID && existing.Number == number {
			return true
		}
	}

	return false
}

func errDuplicateNumber() error {
	return errs.Public("a pool with this number already exists in the pool stage", errs.ErrDuplicate)
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

	if update.Number != nil && f.numberTaken(stored.PoolStageID, *update.Number, id) {
		return fmt.Errorf("update pool: %w", errDuplicateNumber())
	}

	if update.RefereeID != nil {
		stored.RefereeID = update.RefereeID
	}
	if update.Number != nil {
		stored.Number = *update.Number
	}
	if update.Strip != nil {
		stored.Strip = update.Strip
	}
	if update.StartTime != nil {
		stored.StartTime = update.StartTime
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
	delete(f.Tournaments, id)

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

func (f *FakePoolStageLookup) GetPoolStageTournamentID(_ context.Context, id uuid.UUID) (uuid.UUID, error) {
	if f.Err != nil {
		return uuid.Nil, f.Err
	}

	if _, ok := f.PoolStages[id]; !ok {
		return uuid.Nil, fmt.Errorf("select pool stage %s tournament: %w", id, errs.ErrNotFound)
	}

	return TestTournamentID, nil
}
