package eventresult

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SUM(bigint) is numeric in Postgres, hence the casts back to bigint.
const boutScoreColumns = `
       COALESCE(SUM(s.points) FILTER (WHERE s.competitor_id = b.competitor_1_id), 0)::bigint AS competitor_1_score,
       COALESCE(SUM(s.points) FILTER (WHERE s.competitor_id = b.competitor_2_id), 0)::bigint AS competitor_2_score`

const poolStageBoutsQuery = `
SELECT b.status, b.competitor_1_id, b.competitor_2_id,` + boutScoreColumns + `
FROM bouts b
JOIN pools p ON p.id = b.pool_id
LEFT JOIN scorings s ON s.bout_id = b.id AND s.revoked_at IS NULL
WHERE p.pool_stage_id = ?
GROUP BY b.id`

const directEliminationBoutsQuery = `
SELECT b.round_size, b.status, b.competitor_1_id, b.competitor_2_id,` + boutScoreColumns + `
FROM bouts b
LEFT JOIN scorings s ON s.bout_id = b.id AND s.revoked_at IS NULL
WHERE b.direct_elimination_id = ?
GROUP BY b.id`

type EventResultRepository interface {
	GetLatestPoolStage(ctx context.Context, eventID uuid.UUID) (*EventResultPoolStageRow, error)
	GetLatestDirectElimination(ctx context.Context, eventID uuid.UUID) (*EventResultDirectEliminationRow, error)
	ListPoolStageBouts(ctx context.Context, poolStageID uuid.UUID) ([]pool.PoolSheetBoutRow, error)
	ListDirectEliminationEntrants(ctx context.Context, directEliminationID uuid.UUID) ([]directelimination.DirectEliminationEntrant, error)
	ListDirectEliminationBouts(ctx context.Context, directEliminationID uuid.UUID) ([]directelimination.DirectEliminationBoutScore, error)
	ListEventResultCompetitors(ctx context.Context, ids []uuid.UUID) ([]EventResultCompetitor, error)
}

type eventResultRepository struct {
	db *gorm.DB
}

func NewEventResultRepository(db *gorm.DB) EventResultRepository {
	return &eventResultRepository{db: db}
}

type latestStageRow struct {
	ID     uuid.UUID
	Status string
}

func (r *eventResultRepository) latestStage(ctx context.Context, table string, eventID uuid.UUID) (latestStageRow, error) {
	var row latestStageRow

	result := r.db.WithContext(ctx).
		Table(table).
		Select("id, status").
		Where("event_id = ?", eventID).
		Order("created_at DESC, id DESC").
		Limit(1).
		Scan(&row)
	if result.Error != nil {
		return row, fmt.Errorf("select latest %s for event %s: %w", table, eventID, result.Error)
	}
	if result.RowsAffected == 0 {
		return row, fmt.Errorf("select latest %s for event %s: %w", table, eventID, errs.ErrNotFound)
	}

	return row, nil
}

func (r *eventResultRepository) GetLatestPoolStage(ctx context.Context, eventID uuid.UUID) (*EventResultPoolStageRow, error) {
	row, err := r.latestStage(ctx, "pool_stages", eventID)
	if err != nil {
		return nil, err
	}

	return &EventResultPoolStageRow{ID: row.ID, Status: poolstage.PoolStageStatus(row.Status)}, nil
}

func (r *eventResultRepository) GetLatestDirectElimination(ctx context.Context, eventID uuid.UUID) (*EventResultDirectEliminationRow, error) {
	row, err := r.latestStage(ctx, "direct_eliminations", eventID)
	if err != nil {
		return nil, err
	}

	return &EventResultDirectEliminationRow{ID: row.ID, Status: directelimination.DirectEliminationStatus(row.Status)}, nil
}

func (r *eventResultRepository) ListPoolStageBouts(ctx context.Context, poolStageID uuid.UUID) ([]pool.PoolSheetBoutRow, error) {
	var rows []pool.PoolSheetBoutRow

	if err := r.db.WithContext(ctx).Raw(poolStageBoutsQuery, poolStageID).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("select bouts for pool stage %s: %w", poolStageID, err)
	}

	return rows, nil
}

func (r *eventResultRepository) ListDirectEliminationEntrants(ctx context.Context, directEliminationID uuid.UUID) ([]directelimination.DirectEliminationEntrant, error) {
	var rows []directelimination.DirectEliminationEntrant

	err := r.db.WithContext(ctx).
		Table("direct_elimination_entries").
		Select("competitor_id, seed").
		Where("direct_elimination_id = ?", directEliminationID).
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("select entries for direct elimination %s: %w", directEliminationID, err)
	}

	return rows, nil
}

func (r *eventResultRepository) ListDirectEliminationBouts(ctx context.Context, directEliminationID uuid.UUID) ([]directelimination.DirectEliminationBoutScore, error) {
	var rows []directelimination.DirectEliminationBoutScore

	if err := r.db.WithContext(ctx).Raw(directEliminationBoutsQuery, directEliminationID).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("select bouts for direct elimination %s: %w", directEliminationID, err)
	}

	return rows, nil
}

func (r *eventResultRepository) ListEventResultCompetitors(ctx context.Context, ids []uuid.UUID) ([]EventResultCompetitor, error) {
	var rows []EventResultCompetitor

	err := r.db.WithContext(ctx).
		Table("competitors").
		Select("id, first_name, last_name, primary_club, rating").
		Where("id IN ?", ids).
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("select %d competitors: %w", len(ids), err)
	}

	return rows, nil
}
