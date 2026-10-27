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

	Bouts            []pool.PoolBout
	Competitors      map[uuid.UUID]time.Time // competitor id to its created_at
	StageTournaments map[uuid.UUID]uuid.UUID // pool stage id to its tournament
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

		Competitors:      map[uuid.UUID]time.Time{},
		StageTournaments: map[uuid.UUID]uuid.UUID{},
	}
}

func (f *FakePoolRepository) CreatePoolsWithBouts(_ context.Context, lineups []pool.PoolLineup) error {
	if f.Err != nil {
		return f.Err
	}

	// The unique number and referee foreign key are the database's to enforce; the
	// real-database test covers them.
	now := time.Now()
	for i := range lineups {
		lineup := &lineups[i]
		lineup.Pool.ID = uuid.New()
		lineup.Pool.CreatedAt = now
		lineup.Pool.UpdatedAt = now
		f.Pools[lineup.Pool.ID] = lineup.Pool

		for j := range lineup.Bouts {
			lineup.Bouts[j].ID = uuid.New()
			lineup.Bouts[j].PoolID = lineup.Pool.ID
			lineup.Bouts[j].CreatedAt = now
			lineup.Bouts[j].UpdatedAt = now
			f.Bouts = append(f.Bouts, lineup.Bouts[j])
		}
	}

	return nil
}

func (f *FakePoolRepository) GetPoolStageTournamentID(_ context.Context, poolStageID uuid.UUID) (uuid.UUID, error) {
	if f.Err != nil {
		return uuid.Nil, f.Err
	}

	tournamentID, ok := f.StageTournaments[poolStageID]
	if !ok {
		return uuid.Nil, fmt.Errorf("select pool stage %s tournament: %w", poolStageID, errs.ErrNotFound)
	}

	return tournamentID, nil
}

func (f *FakePoolRepository) ListPoolEntrants(_ context.Context, competitorIDs []uuid.UUID) ([]pool.PoolEntrant, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var entrants []pool.PoolEntrant
	for _, id := range competitorIDs {
		if createdAt, ok := f.Competitors[id]; ok {
			entrants = append(entrants, pool.PoolEntrant{ID: id, CreatedAt: createdAt})
		}
	}

	return entrants, nil
}

func (f *FakePoolRepository) ListEnteredCompetitorIDs(
	_ context.Context,
	poolStageID uuid.UUID,
	competitorIDs []uuid.UUID,
	exceptPoolID uuid.UUID,
) ([]uuid.UUID, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var entered []uuid.UUID
	for _, id := range competitorIDs {
		for _, bout := range f.Bouts {
			if bout.PoolID != exceptPoolID && f.Pools[bout.PoolID].PoolStageID == poolStageID &&
				(bout.Competitor1ID == id || bout.Competitor2ID == id) {
				entered = append(entered, id)

				break
			}
		}
	}

	return entered, nil
}

// numberTaken mirrors the unique index on (pool_stage_id, number); except is the
// pool being updated, which may keep its own number.
func (f *FakePoolRepository) GetPoolBoutSummary(_ context.Context, poolID uuid.UUID) (pool.PoolBoutSummary, error) {
	if f.Err != nil {
		return pool.PoolBoutSummary{}, f.Err
	}

	var summary pool.PoolBoutSummary
	for _, bout := range f.Bouts {
		if bout.PoolID != poolID {
			continue
		}
		summary.Total++
		if bout.Status != "upcoming" {
			summary.Started++
		}
		summary.PointsToWin = bout.PointsToWin
		summary.TimeLimitSeconds = bout.TimeLimitSeconds
	}

	return summary, nil
}

// ReplacePoolBouts swaps the pool's bouts; the unique number and referee foreign key are
// the database's to enforce, and the real-database test covers them.
func (f *FakePoolRepository) ReplacePoolBouts(ctx context.Context, id uuid.UUID, update pool.PoolUpdate, bouts []pool.PoolBout) error {
	if f.Err != nil {
		return f.Err
	}

	if _, ok := f.Pools[id]; !ok {
		return fmt.Errorf("select pool %s: %w", id, errs.ErrNotFound)
	}

	kept := make([]pool.PoolBout, 0, len(f.Bouts))
	for _, bout := range f.Bouts {
		if bout.PoolID != id {
			kept = append(kept, bout)
		}
	}
	if err := f.UpdatePoolByID(ctx, id, update); err != nil {
		return err
	}

	now := time.Now()
	for i := range bouts {
		bouts[i].ID = uuid.New()
		bouts[i].PoolID = id
		bouts[i].CreatedAt = now
		bouts[i].UpdatedAt = now
		kept = append(kept, bouts[i])
	}
	f.Bouts = kept

	return nil
}

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
