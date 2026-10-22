package poolboard

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const poolBoardPoolColumns = "pools.id, pools.pool_stage_id, pools.number, pools.strip, " +
	"pools.start_time, pools.started_at, pools.completed_at"

// SUM(bigint) is numeric in Postgres, hence the casts back to bigint.
const poolBoardBoutsQuery = `
SELECT b.id, b.pool_id, b.status, b.competitor_1_id, b.competitor_2_id, b.location, b.start_time,
       COALESCE(SUM(s.points) FILTER (WHERE s.competitor_id = b.competitor_1_id), 0)::bigint AS competitor_1_score,
       COALESCE(SUM(s.points) FILTER (WHERE s.competitor_id = b.competitor_2_id), 0)::bigint AS competitor_2_score
FROM bouts b
LEFT JOIN scorings s ON s.bout_id = b.id AND s.revoked_at IS NULL
WHERE b.pool_id IN ?
GROUP BY b.id
ORDER BY b.start_time ASC NULLS LAST, b.id`

type PoolBoardListFilter struct {
	EventID uuid.UUID
	Limit   int
	Offset  int
}

type PoolBoardRepository interface {
	ListPoolsByEventID(ctx context.Context, filter PoolBoardListFilter) ([]PoolBoardPoolRow, int64, error)
	GetPoolByID(ctx context.Context, id uuid.UUID) (*PoolBoardPoolRow, error)
	ListFencersByPoolIDs(ctx context.Context, poolIDs []uuid.UUID) ([]PoolBoardFencerRow, error)
	ListBoutsByPoolIDs(ctx context.Context, poolIDs []uuid.UUID) ([]PoolBoardBoutRow, error)
}

type poolBoardRepository struct {
	db *gorm.DB
}

func NewPoolBoardRepository(db *gorm.DB) PoolBoardRepository {
	return &poolBoardRepository{db: db}
}

func (r *poolBoardRepository) ListPoolsByEventID(ctx context.Context, filter PoolBoardListFilter) ([]PoolBoardPoolRow, int64, error) {
	base := func() *gorm.DB {
		return r.db.WithContext(ctx).
			Table("pools").
			Joins("JOIN pool_stages ON pool_stages.id = pools.pool_stage_id").
			Where("pool_stages.event_id = ?", filter.EventID)
	}

	var total int64
	if err := base().Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count pool boards: %w", err)
	}

	rows := make([]PoolBoardPoolRow, 0, filter.Limit)
	err := base().
		Select(poolBoardPoolColumns).
		Order("pool_stages.created_at, pool_stages.id, pools.number").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Scan(&rows).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select pool boards: %w", err)
	}

	return rows, total, nil
}

func (r *poolBoardRepository) GetPoolByID(ctx context.Context, id uuid.UUID) (*PoolBoardPoolRow, error) {
	var row PoolBoardPoolRow

	err := r.db.WithContext(ctx).
		Table("pools").
		Select(poolBoardPoolColumns).
		Where("pools.id = ?", id).
		Take(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select pool board %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select pool board %s: %w", id, err)
	}

	return &row, nil
}

func (r *poolBoardRepository) ListFencersByPoolIDs(ctx context.Context, poolIDs []uuid.UUID) ([]PoolBoardFencerRow, error) {
	var rows []PoolBoardFencerRow

	err := r.db.WithContext(ctx).
		Table("pool_competitors").
		Select("pool_competitors.pool_id, pool_competitors.competitor_id, pool_competitors.position, "+
			"competitors.first_name, competitors.last_name, competitors.team").
		Joins("JOIN competitors ON competitors.id = pool_competitors.competitor_id").
		Where("pool_competitors.pool_id IN ?", poolIDs).
		Order("pool_competitors.pool_id, pool_competitors.position").
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("select pool board fencers: %w", err)
	}

	return rows, nil
}

func (r *poolBoardRepository) ListBoutsByPoolIDs(ctx context.Context, poolIDs []uuid.UUID) ([]PoolBoardBoutRow, error) {
	var rows []PoolBoardBoutRow

	if err := r.db.WithContext(ctx).Raw(poolBoardBoutsQuery, poolIDs).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("select pool board bouts: %w", err)
	}

	return rows, nil
}
