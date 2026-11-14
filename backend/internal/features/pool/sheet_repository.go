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

const poolSheetPoolColumns = "pools.id, pools.pool_stage_id, pools.number, pools.strip, " +
	"pools.start_time, pools.started_at, pools.completed_at"

// A pool's fencers are the competitors in its bouts, positioned by registration order.
const poolSheetFencersQuery = `
SELECT m.pool_id, c.id AS competitor_id,
       row_number() OVER (PARTITION BY m.pool_id ORDER BY c.created_at, c.id) AS position,
       c.first_name, c.last_name, c.team
FROM (
    SELECT pool_id, competitor_1_id AS competitor_id FROM bouts WHERE pool_id IN ?
    UNION
    SELECT pool_id, competitor_2_id FROM bouts WHERE pool_id IN ?
) AS m
JOIN competitors c ON c.id = m.competitor_id
ORDER BY m.pool_id, position`

// SUM(bigint) is numeric in Postgres, hence the casts back to bigint.
const poolSheetBoutsQuery = `
SELECT b.id, b.pool_id, b.slot, b.status, b.competitor_1_id, b.competitor_2_id, b.location, b.start_time,
       COALESCE(SUM(s.points) FILTER (WHERE s.competitor_id = b.competitor_1_id), 0)::bigint AS competitor_1_score,
       COALESCE(SUM(s.points) FILTER (WHERE s.competitor_id = b.competitor_2_id), 0)::bigint AS competitor_2_score
FROM bouts b
LEFT JOIN scorings s ON s.bout_id = b.id AND s.revoked_at IS NULL
WHERE b.pool_id IN ?
GROUP BY b.id
ORDER BY b.pool_id, b.slot`

type PoolSheetListFilter struct {
	EventID *uuid.UUID
	IDs     []uuid.UUID
	Limit   int
	Offset  int
}

type PoolSheetRepository interface {
	ListPoolSheets(ctx context.Context, filter PoolSheetListFilter) ([]PoolSheetPoolRow, int64, error)
	GetPoolSheetByID(ctx context.Context, id uuid.UUID) (*PoolSheetPoolRow, error)
	ListPoolSheetFencers(ctx context.Context, poolIDs []uuid.UUID) ([]PoolSheetFencerRow, error)
	ListPoolSheetBouts(ctx context.Context, poolIDs []uuid.UUID) ([]PoolSheetBoutRow, error)
	// ReadSnapshot runs read against one read-only, repeatable-read transaction, so
	// a sheet's pools, fencers and bouts all come from the same moment. Under the
	// default read-committed level each query would see edits made in between.
	ReadSnapshot(ctx context.Context, read func(repo PoolSheetRepository) error) error
}

type poolSheetRepository struct {
	db *gorm.DB
}

func NewPoolSheetRepository(db *gorm.DB) PoolSheetRepository {
	return &poolSheetRepository{db: db}
}

func (r *poolSheetRepository) ReadSnapshot(ctx context.Context, read func(repo PoolSheetRepository) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return read(&poolSheetRepository{db: tx})
	}, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
}

func (r *poolSheetRepository) ListPoolSheets(ctx context.Context, filter PoolSheetListFilter) ([]PoolSheetPoolRow, int64, error) {
	base := func() *gorm.DB {
		query := r.db.WithContext(ctx).
			Table("pools").
			Joins("JOIN pool_stages ON pool_stages.id = pools.pool_stage_id")
		if filter.EventID != nil {
			query = query.Where("pool_stages.event_id = ?", *filter.EventID)
		}
		if len(filter.IDs) > 0 {
			query = query.Where("pools.id IN ?", filter.IDs)
		}
		return query
	}

	var total int64
	if err := base().Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count pool sheets: %w", err)
	}

	rows := make([]PoolSheetPoolRow, 0, filter.Limit)
	err := base().
		Select(poolSheetPoolColumns).
		Order("pool_stages.created_at, pool_stages.id, pools.number").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Scan(&rows).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select pool sheets: %w", err)
	}

	return rows, total, nil
}

func (r *poolSheetRepository) GetPoolSheetByID(ctx context.Context, id uuid.UUID) (*PoolSheetPoolRow, error) {
	var row PoolSheetPoolRow

	err := r.db.WithContext(ctx).
		Table("pools").
		Select(poolSheetPoolColumns).
		Where("pools.id = ?", id).
		Take(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select pool sheet %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select pool sheet %s: %w", id, err)
	}

	return &row, nil
}

func (r *poolSheetRepository) ListPoolSheetFencers(ctx context.Context, poolIDs []uuid.UUID) ([]PoolSheetFencerRow, error) {
	var rows []PoolSheetFencerRow

	err := r.db.WithContext(ctx).Raw(poolSheetFencersQuery, poolIDs, poolIDs).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("select pool sheet fencers: %w", err)
	}

	return rows, nil
}

func (r *poolSheetRepository) ListPoolSheetBouts(ctx context.Context, poolIDs []uuid.UUID) ([]PoolSheetBoutRow, error) {
	var rows []PoolSheetBoutRow

	if err := r.db.WithContext(ctx).Raw(poolSheetBoutsQuery, poolIDs).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("select pool sheet bouts: %w", err)
	}

	return rows, nil
}
