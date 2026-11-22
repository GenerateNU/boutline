package poolstageresult

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Club falls back to the legacy team column until every competitor has a primary club.
const poolStageResultFencersQuery = `
SELECT DISTINCT c.id AS competitor_id, c.first_name, c.last_name,
       COALESCE(c.primary_club, NULLIF(c.team, '')) AS club, p.number AS pool_number
FROM bouts b
JOIN pools p ON p.id = b.pool_id
JOIN competitors c ON c.id IN (b.competitor_1_id, b.competitor_2_id)
WHERE p.pool_stage_id = ?`

// SUM(bigint) is numeric in Postgres, hence the casts back to bigint.
const poolStageBoutsQuery = `
SELECT b.status, b.competitor_1_id, b.competitor_2_id,
       COALESCE(SUM(s.points) FILTER (WHERE s.competitor_id = b.competitor_1_id), 0)::bigint AS competitor_1_score,
       COALESCE(SUM(s.points) FILTER (WHERE s.competitor_id = b.competitor_2_id), 0)::bigint AS competitor_2_score
FROM bouts b
JOIN pools p ON p.id = b.pool_id
LEFT JOIN scorings s ON s.bout_id = b.id AND s.revoked_at IS NULL
WHERE p.pool_stage_id = ?
GROUP BY b.id`

type PoolStageResultRepository interface {
	GetLatestPoolStageID(ctx context.Context, eventID uuid.UUID) (uuid.UUID, error)
	ListPoolStageResultFencers(ctx context.Context, poolStageID uuid.UUID) ([]PoolStageResultFencer, error)
	ListPoolStageBouts(ctx context.Context, poolStageID uuid.UUID) ([]pool.PoolSheetBoutRow, error)
	// ListTableauEntrantIDs reads the event's latest direct elimination, which is
	// empty until its tableau is drawn.
	ListTableauEntrantIDs(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error)
}

type poolStageResultRepository struct {
	db *gorm.DB
}

func NewPoolStageResultRepository(db *gorm.DB) PoolStageResultRepository {
	return &poolStageResultRepository{db: db}
}

func latestStageOfEvent(db *gorm.DB, table string, eventID uuid.UUID) *gorm.DB {
	return db.Table(table).
		Select("id").
		Where("event_id = ?", eventID).
		Order("created_at DESC, id DESC").
		Limit(1)
}

func (r *poolStageResultRepository) GetLatestPoolStageID(ctx context.Context, eventID uuid.UUID) (uuid.UUID, error) {
	var ids []uuid.UUID

	if err := latestStageOfEvent(r.db.WithContext(ctx), "pool_stages", eventID).Pluck("id", &ids).Error; err != nil {
		return uuid.Nil, fmt.Errorf("select latest pool stage for event %s: %w", eventID, err)
	}
	if len(ids) == 0 {
		return uuid.Nil, fmt.Errorf("select latest pool stage for event %s: %w", eventID, errs.ErrNotFound)
	}

	return ids[0], nil
}

func (r *poolStageResultRepository) ListPoolStageResultFencers(ctx context.Context, poolStageID uuid.UUID) ([]PoolStageResultFencer, error) {
	var rows []PoolStageResultFencer

	if err := r.db.WithContext(ctx).Raw(poolStageResultFencersQuery, poolStageID).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("select fencers for pool stage %s: %w", poolStageID, err)
	}

	return rows, nil
}

func (r *poolStageResultRepository) ListPoolStageBouts(ctx context.Context, poolStageID uuid.UUID) ([]pool.PoolSheetBoutRow, error) {
	var rows []pool.PoolSheetBoutRow

	if err := r.db.WithContext(ctx).Raw(poolStageBoutsQuery, poolStageID).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("select bouts for pool stage %s: %w", poolStageID, err)
	}

	return rows, nil
}

func (r *poolStageResultRepository) ListTableauEntrantIDs(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID

	db := r.db.WithContext(ctx)
	err := db.Table("direct_elimination_entries").
		Where("direct_elimination_id = (?)", latestStageOfEvent(db, "direct_eliminations", eventID)).
		Pluck("competitor_id", &ids).Error
	if err != nil {
		return nil, fmt.Errorf("select tableau entrants for event %s: %w", eventID, err)
	}

	return ids, nil
}
