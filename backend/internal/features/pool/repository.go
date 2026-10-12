package pool

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PoolRepository interface {
	CreatePool(ctx context.Context, pool *Pool) error
	GetPoolByID(ctx context.Context, id uuid.UUID) (*Pool, error)
	GetPoolTournamentID(ctx context.Context, id uuid.UUID) (uuid.UUID, error)
	ListPools(ctx context.Context, filter PoolListFilter) ([]Pool, int64, error)
	UpdatePoolByID(ctx context.Context, id uuid.UUID, update PoolUpdate) error
	DeletePoolByID(ctx context.Context, id uuid.UUID) error
}

type PoolUpdate struct {
	RefereeID *uuid.UUID
}

func (p PoolUpdate) columns() map[string]any {
	columns := make(map[string]any, 1)

	if p.RefereeID != nil {
		columns["referee_id"] = *p.RefereeID
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

func (r *poolRepository) CreatePool(ctx context.Context, pool *Pool) error {
	if err := r.db.WithContext(ctx).Create(pool).Error; err != nil {
		return translatePoolWriteError("create pool", err)
	}

	return nil
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
		_, err := r.GetPoolByID(ctx, id)
		return err
	}

	return nil
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
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("pool_stage_id or referee_id does not reference an existing record", errs.ErrInvalidInput))
	}

	return fmt.Errorf("%s: %w", op, err)
}
