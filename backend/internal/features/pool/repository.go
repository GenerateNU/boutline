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
	CreatePoolsWithBouts(ctx context.Context, lineups []PoolLineup) error
	GetPoolByID(ctx context.Context, id uuid.UUID) (*Pool, error)
	GetPoolTournamentID(ctx context.Context, id uuid.UUID) (uuid.UUID, error)
	GetPoolStageTournamentID(ctx context.Context, poolStageID uuid.UUID) (uuid.UUID, error)
	ListPoolEntrants(ctx context.Context, competitorIDs []uuid.UUID) ([]PoolEntrant, error)
	ListEnteredCompetitorIDs(ctx context.Context, poolStageID uuid.UUID, competitorIDs []uuid.UUID, exceptPoolID uuid.UUID) ([]uuid.UUID, error)
	GetPoolBoutSummary(ctx context.Context, poolID uuid.UUID) (PoolBoutSummary, error)
	ListPools(ctx context.Context, filter PoolListFilter) ([]Pool, int64, error)
	UpdatePoolByID(ctx context.Context, id uuid.UUID, update PoolUpdate) error
	ReplacePoolBouts(ctx context.Context, id uuid.UUID, update PoolUpdate, bouts []PoolBout) error
	StartPoolByID(ctx context.Context, id uuid.UUID, startedAt time.Time) error
	EndPoolByID(ctx context.Context, id uuid.UUID, completedAt time.Time) error
	CountOpenPoolBouts(ctx context.Context, id uuid.UUID) (int64, error)
	DeletePoolByID(ctx context.Context, id uuid.UUID) error
}

// Mirrors bout.BoutStatusEnded; the bout package imports this one, so it cannot be referenced here.
const endedBoutStatus = "ended"

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
				return translatePoolWriteError("create pools", err)
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

func (r *poolRepository) GetPoolStageTournamentID(ctx context.Context, poolStageID uuid.UUID) (uuid.UUID, error) {
	var tournamentID uuid.UUID

	err := r.db.WithContext(ctx).
		Table("pool_stages").
		Select("events.tournament_id").
		Joins("JOIN events ON events.id = pool_stages.event_id").
		Where("pool_stages.id = ?", poolStageID).
		Row().
		Scan(&tournamentID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return uuid.Nil, fmt.Errorf("select pool stage %s tournament: %w", poolStageID, errs.ErrNotFound)
		}
		return uuid.Nil, fmt.Errorf("select pool stage %s tournament: %w", poolStageID, err)
	}

	return tournamentID, nil
}

func (r *poolRepository) ListPoolEntrants(ctx context.Context, competitorIDs []uuid.UUID) ([]PoolEntrant, error) {
	var entrants []PoolEntrant

	err := r.db.WithContext(ctx).
		Table("competitors").
		Select("id, created_at").
		Where("id IN ?", competitorIDs).
		Scan(&entrants).Error
	if err != nil {
		return nil, fmt.Errorf("select competitors: %w", err)
	}

	return entrants, nil
}

func (r *poolRepository) ListEnteredCompetitorIDs(
	ctx context.Context,
	poolStageID uuid.UUID,
	competitorIDs []uuid.UUID,
	exceptPoolID uuid.UUID,
) ([]uuid.UUID, error) {
	var entered []uuid.UUID

	err := r.db.WithContext(ctx).Raw(`
		SELECT b.competitor_1_id FROM bouts b JOIN pools p ON p.id = b.pool_id
		WHERE p.pool_stage_id = ? AND p.id <> ? AND b.competitor_1_id IN ?
		UNION
		SELECT b.competitor_2_id FROM bouts b JOIN pools p ON p.id = b.pool_id
		WHERE p.pool_stage_id = ? AND p.id <> ? AND b.competitor_2_id IN ?`,
		poolStageID, exceptPoolID, competitorIDs, poolStageID, exceptPoolID, competitorIDs).
		Scan(&entered).Error
	if err != nil {
		return nil, fmt.Errorf("select competitors already in pool stage %s: %w", poolStageID, err)
	}

	return entered, nil
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
	result := r.db.WithContext(ctx).Model(&Pool{}).Where("id = ?", id).Updates(update.columns())
	if result.Error != nil {
		return translatePoolWriteError(fmt.Sprintf("update pool %s", id), result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetPoolByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update pool %s: no row updated", id)
	}

	return nil
}

// PoolBoutSummary is what re-seating a pool needs to know about its current bouts.
type PoolBoutSummary struct {
	Total            int64
	Started          int64 `gorm:"column:started"`
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
		FROM bouts WHERE pool_id = ?`, poolBoutStatusUpcoming, poolID).
		Scan(&summary).Error
	if err != nil {
		return PoolBoutSummary{}, fmt.Errorf("summarise bouts of pool %s: %w", poolID, err)
	}

	return summary, nil
}

// ReplacePoolBouts applies the update and swaps the pool's bouts in one transaction.
// Only upcoming bouts are deleted, and a bout that started since the caller checked
// rolls the whole change back.
func (r *poolRepository) ReplacePoolBouts(ctx context.Context, id uuid.UUID, update PoolUpdate, bouts []PoolBout) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if columns := update.columns(); len(columns) > 0 {
			if err := tx.Model(&Pool{}).Where("id = ?", id).Updates(columns).Error; err != nil {
				return translatePoolWriteError(fmt.Sprintf("update pool %s", id), err)
			}
		}

		if err := tx.Where("pool_id = ? AND status = ?", id, poolBoutStatusUpcoming).Delete(&PoolBout{}).Error; err != nil {
			if errors.Is(err, gorm.ErrForeignKeyViolated) {
				return fmt.Errorf("delete bouts of pool %s: %w", id, errs.Public(msgPoolFencersLocked, errs.ErrConflict))
			}
			return fmt.Errorf("delete bouts of pool %s: %w", id, err)
		}
		var remaining int64
		if err := tx.Model(&PoolBout{}).Where("pool_id = ?", id).Count(&remaining).Error; err != nil {
			return fmt.Errorf("count bouts of pool %s: %w", id, err)
		}
		if remaining > 0 {
			return fmt.Errorf("replace bouts of pool %s: %w", id, errs.Public(msgPoolFencersLocked, errs.ErrConflict))
		}

		for i := range bouts {
			bouts[i].PoolID = id
		}
		if err := tx.Create(&bouts).Error; err != nil {
			return translatePoolWriteError(fmt.Sprintf("insert bouts of pool %s", id), err)
		}

		return nil
	})
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
