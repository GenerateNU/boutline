package directelimination

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DrawRepository interface {
	WithLockedDirectElimination(
		ctx context.Context,
		id uuid.UUID,
		fn func(repo DrawRepository, de LockedDirectElimination) error,
	) error
	CountDirectEliminationEntries(ctx context.Context, id uuid.UUID) (int64, error)
	// GetEventPoolStage returns the newest pool stage of the event, wrapping errs.ErrNotFound if it has none.
	GetEventPoolStage(ctx context.Context, eventID uuid.UUID) (*poolstage.PoolStage, error)
	ListPoolStageStandingRows(
		ctx context.Context,
		poolStageID uuid.UUID,
	) ([]pool.PoolSheetFencerRow, []pool.PoolSheetBoutRow, error)
	CreateDraw(ctx context.Context, entries []DrawEntry, bouts []DrawBout) error
}

type drawRepository struct {
	db *gorm.DB
}

func NewDrawRepository(db *gorm.DB) DrawRepository {
	return &drawRepository{db: db}
}

// WithLockedDirectElimination runs fn in one transaction holding the direct elimination
// row lock. fn gets a repository bound to that transaction and must do all its reads
// through it: a read on another connection while the transaction holds one can starve
// the connection pool. The tournament row is share-locked too, so the tournament can't
// end between fn's active check and its insert.
func (r *drawRepository) WithLockedDirectElimination(
	ctx context.Context,
	id uuid.UUID,
	fn func(repo DrawRepository, de LockedDirectElimination) error,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var de LockedDirectElimination
		result := tx.Raw(`
			SELECT de.status, de.event_id, e.tournament_id, t.status AS tournament_status
			FROM direct_eliminations de
			JOIN events e ON e.id = de.event_id
			JOIN tournaments t ON t.id = e.tournament_id
			WHERE de.id = ? FOR UPDATE OF de FOR SHARE OF t`, id).
			Scan(&de)
		if result.Error != nil {
			return fmt.Errorf("lock direct elimination %s: %w", id, result.Error)
		}
		if result.RowsAffected == 0 {
			return fmt.Errorf("lock direct elimination %s: %w", id, errs.ErrNotFound)
		}

		return fn(&drawRepository{db: tx}, de)
	})
}

func (r *drawRepository) CountDirectEliminationEntries(ctx context.Context, id uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&DrawEntry{}).
		Where("direct_elimination_id = ?", id).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("count direct elimination %s entries: %w", id, err)
	}

	return count, nil
}

func (r *drawRepository) GetEventPoolStage(ctx context.Context, eventID uuid.UUID) (*poolstage.PoolStage, error) {
	var stage poolstage.PoolStage
	err := r.db.WithContext(ctx).
		Where("event_id = ?", eventID).
		Order("created_at DESC").
		First(&stage).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("select pool stage of event %s: %w", eventID, errs.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("select pool stage of event %s: %w", eventID, err)
	}

	return &stage, nil
}

func (r *drawRepository) ListPoolStageStandingRows(
	ctx context.Context,
	poolStageID uuid.UUID,
) ([]pool.PoolSheetFencerRow, []pool.PoolSheetBoutRow, error) {
	var poolIDs []uuid.UUID
	err := r.db.WithContext(ctx).
		Table("pools").
		Where("pool_stage_id = ?", poolStageID).
		Pluck("id", &poolIDs).Error
	if err != nil {
		return nil, nil, fmt.Errorf("select pools of stage %s: %w", poolStageID, err)
	}
	if len(poolIDs) == 0 {
		return []pool.PoolSheetFencerRow{}, []pool.PoolSheetBoutRow{}, nil
	}

	sheets := pool.NewPoolSheetRepository(r.db)
	fencers, err := sheets.ListPoolSheetFencers(ctx, poolIDs)
	if err != nil {
		return nil, nil, err
	}
	bouts, err := sheets.ListPoolSheetBouts(ctx, poolIDs)
	if err != nil {
		return nil, nil, err
	}

	return fencers, bouts, nil
}

func (r *drawRepository) CreateDraw(ctx context.Context, entries []DrawEntry, bouts []DrawBout) error {
	if err := r.db.WithContext(ctx).Create(&entries).Error; err != nil {
		return fmt.Errorf("insert direct elimination entries: %w", err)
	}
	if len(bouts) == 0 {
		return nil
	}
	if err := r.db.WithContext(ctx).Create(&bouts).Error; err != nil {
		return fmt.Errorf("insert direct elimination bouts: %w", err)
	}

	return nil
}
