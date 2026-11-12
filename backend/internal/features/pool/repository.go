package pool

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PoolRepository interface {
	WithLockedPoolStage(ctx context.Context, poolStageID uuid.UUID, fn func(repo PoolRepository, stage LockedPoolStage) error) error
	CreatePoolsWithBouts(ctx context.Context, lineups []PoolLineup) error
	GetPoolByID(ctx context.Context, id uuid.UUID) (*Pool, error)
	GetPoolTournamentID(ctx context.Context, id uuid.UUID) (uuid.UUID, error)
	ListPoolEntrants(ctx context.Context, poolStageID uuid.UUID, competitorIDs []uuid.UUID, exceptPoolID uuid.UUID) ([]PoolEntrant, error)
	GetPoolBoutSummary(ctx context.Context, poolID uuid.UUID) (PoolBoutSummary, error)
	ListPools(ctx context.Context, filter PoolListFilter) ([]Pool, int64, error)
	UpdatePoolByID(ctx context.Context, id uuid.UUID, update PoolUpdate) error
	ReplacePoolBouts(ctx context.Context, id uuid.UUID, update PoolUpdate, bouts []PoolBout) error
	StartPoolByID(ctx context.Context, id uuid.UUID, startedAt time.Time) error
	EndPoolByID(ctx context.Context, id uuid.UUID, completedAt time.Time) error
	CountOpenPoolBouts(ctx context.Context, id uuid.UUID) (int64, error)
	DeletePoolByID(ctx context.Context, id uuid.UUID) error
}

// Mirror bout's statuses; bout imports this package, so they can't be referenced here.
const (
	endedBoutStatus    = "ended"
	upcomingBoutStatus = "upcoming"
)

type PoolUpdate struct {
	RefereeID *uuid.UUID
	Number    *int
	Strip     *string
	StartTime *time.Time
}

func (p PoolUpdate) columns() map[string]any {
	columns := make(map[string]any, 4)

	if p.RefereeID != nil {
		columns["referee_id"] = *p.RefereeID
	}
	if p.Number != nil {
		columns["number"] = *p.Number
	}
	if p.Strip != nil {
		columns["strip"] = *p.Strip
	}
	if p.StartTime != nil {
		columns["start_time"] = *p.StartTime
	}

	return columns
}

// boutColumns maps a pool update onto the bout columns copied from the pool (§11.1).
func (p PoolUpdate) boutColumns() map[string]any {
	columns := make(map[string]any, 3)

	if p.RefereeID != nil {
		columns["referee_id"] = *p.RefereeID
	}
	if p.Number != nil {
		columns["group_number"] = *p.Number
	}
	if p.Strip != nil {
		columns["location"] = *p.Strip
	}

	return columns
}

type PoolListFilter struct {
	PoolStageID *uuid.UUID
	Limit       int
	Offset      int
}

type poolRepository struct {
	db *gorm.DB
}

func NewPoolRepository(db *gorm.DB) PoolRepository {
	return &poolRepository{db: db}
}

func (r *poolRepository) CreatePoolsWithBouts(ctx context.Context, lineups []PoolLineup) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i := range lineups {
			if err := tx.Create(&lineups[i].Pool).Error; err != nil {
				return translatePoolWriteError("create pools", err)
			}

			for j := range lineups[i].Bouts {
				lineups[i].Bouts[j].PoolID = lineups[i].Pool.ID
			}
			if err := tx.Create(&lineups[i].Bouts).Error; err != nil {
				// The pool insert already proved the referee exists, and the tournament is
				// share-locked, so a foreign key failure here is a competitor deleted since
				// create checked it.
				if errors.Is(err, gorm.ErrForeignKeyViolated) {
					return fmt.Errorf("create pools: %w",
						errs.Public("every fencer must reference an existing competitor", errs.ErrInvalidInput))
				}
				return fmt.Errorf("create pools: %w", err)
			}
		}

		return nil
	})
}

func (r *poolRepository) GetPoolByID(ctx context.Context, id uuid.UUID) (*Pool, error) {
	var pool Pool

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&pool).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select pool %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select pool %s: %w", id, err)
	}

	return &pool, nil
}

func (r *poolRepository) GetPoolTournamentID(ctx context.Context, id uuid.UUID) (uuid.UUID, error) {
	var tournamentID uuid.UUID

	err := r.db.WithContext(ctx).
		Table("pools").
		Select("events.tournament_id").
		Joins("JOIN pool_stages ON pool_stages.id = pools.pool_stage_id").
		Joins("JOIN events ON events.id = pool_stages.event_id").
		Where("pools.id = ?", id).
		Row().
		Scan(&tournamentID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return uuid.Nil, fmt.Errorf("select pool %s tournament: %w", id, errs.ErrNotFound)
		}
		return uuid.Nil, fmt.Errorf("select pool %s tournament: %w", id, err)
	}

	return tournamentID, nil
}

// WithLockedPoolStage runs fn in one transaction holding the pool stage row lock
// that pool edits and pool-bout creates also take (design §11.2). fn gets a
// repository bound to that transaction and must do all its reads through it:
// a read on another connection while the transaction holds one can starve the
// connection pool. The tournament row is share-locked too, so the tournament
// can't end between fn's active check and its insert.
func (r *poolRepository) WithLockedPoolStage(
	ctx context.Context,
	poolStageID uuid.UUID,
	fn func(repo PoolRepository, stage LockedPoolStage) error,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stage LockedPoolStage
		result := tx.Raw(`
			SELECT ps.status, ps.max_competitor_per_pool, ps.event_id, e.tournament_id, t.status AS tournament_status
			FROM pool_stages ps
			JOIN events e ON e.id = ps.event_id
			JOIN tournaments t ON t.id = e.tournament_id
			WHERE ps.id = ? FOR UPDATE OF ps FOR SHARE OF t`, poolStageID).
			Scan(&stage)
		if result.Error != nil {
			return fmt.Errorf("lock pool stage %s: %w", poolStageID, result.Error)
		}
		if result.RowsAffected == 0 {
			return fmt.Errorf("lock pool stage %s: %w", poolStageID, errs.ErrNotFound)
		}

		return fn(&poolRepository{db: tx}, stage)
	})
}

func (r *poolRepository) ListPoolEntrants(
	ctx context.Context,
	poolStageID uuid.UUID,
	competitorIDs []uuid.UUID,
	exceptPoolID uuid.UUID,
) ([]PoolEntrant, error) {
	var entrants []PoolEntrant

	// Each requested competitor's event, and whether they already fence a bout in one of
	// this stage's pools other than exceptPoolID.
	err := r.db.WithContext(ctx).Raw(`
		SELECT c.id, c.event_id, EXISTS (
			SELECT 1 FROM bouts b
			JOIN pools p ON p.id = b.pool_id
			WHERE p.pool_stage_id = ? AND p.id <> ? AND (b.competitor_1_id = c.id OR b.competitor_2_id = c.id)
		) AS seated
		FROM competitors c
		WHERE c.id IN ?`, poolStageID, exceptPoolID, competitorIDs).
		Scan(&entrants).Error
	if err != nil {
		return nil, fmt.Errorf("select competitors: %w", err)
	}

	return entrants, nil
}

func (r *poolRepository) ListPools(ctx context.Context, filter PoolListFilter) ([]Pool, int64, error) {
	query := r.db.WithContext(ctx).Model(&Pool{})
	if filter.PoolStageID != nil {
		query = query.Where("pool_stage_id = ?", *filter.PoolStageID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count pools: %w", err)
	}

	pools := make([]Pool, 0, filter.Limit)
	err := query.
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&pools).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select pools: %w", err)
	}

	return pools, total, nil
}

func (r *poolRepository) UpdatePoolByID(ctx context.Context, id uuid.UUID, update PoolUpdate) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Serializes with pool-bout creates, so one made mid-edit copies the new values.
		if err := LockPoolStage(tx, id); err != nil {
			return err
		}

		// Update the pool.
		result := tx.Model(&Pool{}).Where("id = ?", id).Updates(update.columns())
		if result.Error != nil {
			return translatePoolWriteError(fmt.Sprintf("update pool %s", id), result.Error)
		}

		if result.RowsAffected == 0 {
			if _, err := r.GetPoolByID(ctx, id); err != nil {
				return err
			}
			return fmt.Errorf("update pool %s: no row updated", id)
		}

		// Nothing to sync unless a copied field changed.
		boutColumns := update.boutColumns()
		if len(boutColumns) == 0 {
			return nil
		}
		boutColumns["updated_at"] = time.Now()

		// Sync upcoming bouts; started ones keep their values.
		err := tx.Table("bouts").
			Where("pool_id = ? AND status = ?", id, upcomingBoutStatus).
			Updates(boutColumns).Error
		if err != nil {
			return fmt.Errorf("update upcoming bouts of pool %s: %w", id, err)
		}

		return nil
	})
}

// PoolBoutSummary is what re-seating a pool needs to know about its current bouts.
type PoolBoutSummary struct {
	Total            int64
	Started          int64
	PointsToWin      int
	TimeLimitSeconds int
}

func (r *poolRepository) GetPoolBoutSummary(ctx context.Context, poolID uuid.UUID) (PoolBoutSummary, error) {
	var summary PoolBoutSummary

	err := r.db.WithContext(ctx).Raw(`
		SELECT count(*) AS total,
		       count(*) FILTER (WHERE status <> ?) AS started,
		       COALESCE(max(points_to_win), 0) AS points_to_win,
		       COALESCE(max(time_limit_seconds), 0) AS time_limit_seconds
		FROM bouts WHERE pool_id = ?`, upcomingBoutStatus, poolID).
		Scan(&summary).Error
	if err != nil {
		return PoolBoutSummary{}, fmt.Errorf("summarise bouts of pool %s: %w", poolID, err)
	}

	return summary, nil
}

// ReplacePoolBouts applies the update and swaps the pool's bouts in one transaction.
// Re-seat checks the pool under the stage lock, but starting a pool or a bout doesn't
// take that lock, so this refuses again if the pool has started, and deletes only
// upcoming bouts, rolling back if any others remain.
func (r *poolRepository) ReplacePoolBouts(ctx context.Context, id uuid.UUID, update PoolUpdate, bouts []PoolBout) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		locked := fmt.Errorf("replace bouts of pool %s: %w", id, errs.Public(msgPoolFencersLocked, errs.ErrConflict))

		columns := update.columns()
		columns["updated_at"] = time.Now()
		result := tx.Model(&Pool{}).Where("id = ? AND started_at IS NULL", id).Updates(columns)
		if result.Error != nil {
			return translatePoolWriteError(fmt.Sprintf("update pool %s", id), result.Error)
		}
		if result.RowsAffected == 0 {
			return locked
		}

		// A scoring still pointing at an upcoming bout blocks its delete (design §9.1).
		err := tx.Where("pool_id = ? AND status = ?", id, upcomingBoutStatus).Delete(&PoolBout{}).Error
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			return locked
		}
		if err != nil {
			return fmt.Errorf("delete bouts of pool %s: %w", id, err)
		}
		var remaining int64
		if err := tx.Model(&PoolBout{}).Where("pool_id = ?", id).Count(&remaining).Error; err != nil {
			return fmt.Errorf("count bouts of pool %s: %w", id, err)
		}
		if remaining > 0 {
			return locked
		}

		for i := range bouts {
			bouts[i].PoolID = id
		}
		if err := tx.Create(&bouts).Error; err != nil {
			// As in create: the pool update proved the referee exists, so this is a
			// competitor deleted since re-seat checked it.
			if errors.Is(err, gorm.ErrForeignKeyViolated) {
				return fmt.Errorf("insert bouts of pool %s: %w", id,
					errs.Public("every fencer must reference an existing competitor", errs.ErrInvalidInput))
			}
			return fmt.Errorf("insert bouts of pool %s: %w", id, err)
		}

		return nil
	})
}

// LockPoolStage locks a pool's stage row until tx ends. Pool edits, pool-bout
// creates and pool create (WithLockedPoolStage) share it.
func LockPoolStage(tx *gorm.DB, poolID uuid.UUID) error {
	err := tx.Exec("SELECT 1 FROM pool_stages WHERE id = (SELECT pool_stage_id FROM pools WHERE id = ?) FOR UPDATE",
		poolID).Error
	if err != nil {
		return fmt.Errorf("lock pool stage of pool %s: %w", poolID, err)
	}

	return nil
}

func (r *poolRepository) StartPoolByID(ctx context.Context, id uuid.UUID, startedAt time.Time) error {
	return r.stampByID(ctx, id, "started_at IS NULL", map[string]any{"started_at": startedAt})
}

func (r *poolRepository) EndPoolByID(ctx context.Context, id uuid.UUID, completedAt time.Time) error {
	return r.stampByID(ctx, id, "started_at IS NOT NULL AND completed_at IS NULL",
		map[string]any{"completed_at": completedAt})
}

func (r *poolRepository) stampByID(ctx context.Context, id uuid.UUID, guard string, columns map[string]any) error {
	result := r.db.WithContext(ctx).Model(&Pool{}).Where("id = ?", id).Where(guard).Updates(columns)
	if result.Error != nil {
		return fmt.Errorf("update pool %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetPoolByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update pool %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *poolRepository) CountOpenPoolBouts(ctx context.Context, id uuid.UUID) (int64, error) {
	var open int64

	err := r.db.WithContext(ctx).
		Table("bouts").
		Where("pool_id = ? AND status <> ?", id, endedBoutStatus).
		Count(&open).Error
	if err != nil {
		return 0, fmt.Errorf("count open bouts of pool %s: %w", id, err)
	}

	return open, nil
}

func (r *poolRepository) DeletePoolByID(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Where("id = ?", id).Delete(&Pool{})
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("delete pool %s: %w", id,
				errs.Public("a pool with bouts cannot be deleted", errs.ErrConflict))
		}
		return fmt.Errorf("delete pool %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("delete pool %s: %w", id, errs.ErrNotFound)
	}

	return nil
}

func translatePoolWriteError(op string, err error) error {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("a pool with this number already exists in the pool stage", errs.ErrDuplicate))
	}
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("referee_id does not reference an existing record", errs.ErrInvalidInput))
	}

	return fmt.Errorf("%s: %w", op, err)
}
