package poolstage

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PoolStageRepository interface {
	CreatePoolStage(ctx context.Context, stage *PoolStage) error
	GetPoolStageByID(ctx context.Context, id uuid.UUID) (*PoolStage, error)
	ListPoolStages(ctx context.Context, filter PoolStageListFilter) ([]PoolStage, int64, error)
	UpdatePoolStageByID(ctx context.Context, id uuid.UUID, update PoolStageUpdate) error
	DeletePoolStageByID(ctx context.Context, id uuid.UUID) error
}

type PoolStageUpdate struct {
	MaxCompetitorPerPool *int
	StartTime            *time.Time
}

func (p PoolStageUpdate) columns() map[string]any {
	columns := make(map[string]any, 2)

	if p.MaxCompetitorPerPool != nil {
		columns["max_competitor_per_pool"] = *p.MaxCompetitorPerPool
	}
	if p.StartTime != nil {
		columns["start_time"] = *p.StartTime
	}

	return columns
}

type PoolStageListFilter struct {
	EventID *uuid.UUID
	Status  PoolStageStatus
	Limit   int
	Offset  int
}

type poolStageRepository struct {
	db *gorm.DB
}

func NewPoolStageRepository(db *gorm.DB) PoolStageRepository {
	return &poolStageRepository{db: db}
}

func (r *poolStageRepository) CreatePoolStage(ctx context.Context, stage *PoolStage) error {
	if err := r.db.WithContext(ctx).Create(stage).Error; err != nil {
		return translatePoolStageWriteError("create pool stage", err)
	}

	return nil
}

func (r *poolStageRepository) GetPoolStageByID(ctx context.Context, id uuid.UUID) (*PoolStage, error) {
	var stage PoolStage

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&stage).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select pool stage %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select pool stage %s: %w", id, err)
	}

	return &stage, nil
}

func (r *poolStageRepository) ListPoolStages(
	ctx context.Context,
	filter PoolStageListFilter,
) ([]PoolStage, int64, error) {
	query := r.db.WithContext(ctx).Model(&PoolStage{})
	if filter.EventID != nil {
		query = query.Where("event_id = ?", *filter.EventID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count pool stages: %w", err)
	}

	stages := make([]PoolStage, 0, filter.Limit)
	err := query.
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&stages).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select pool stages: %w", err)
	}

	return stages, total, nil
}

func (r *poolStageRepository) UpdatePoolStageByID(ctx context.Context, id uuid.UUID, update PoolStageUpdate) error {
	query := r.db.WithContext(ctx).Model(&PoolStage{}).
		Where("id = ? AND status IN ?", id, PoolStageEditableStatuses())

	result := query.Updates(update.columns())
	if result.Error != nil {
		return translatePoolStageWriteError(fmt.Sprintf("update pool stage %s", id), result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetPoolStageByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update pool stage %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *poolStageRepository) DeletePoolStageByID(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND status IN ?", id, PoolStageDeletableStatuses()).
		Delete(&PoolStage{})
	if result.Error != nil {
		// The delete cascades to the stage's pools, and bouts.pool_id restricts
		// deleting any pool that still has bouts.
		if errors.Is(result.Error, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("delete pool stage %s: %w", id,
				errs.Public("a pool stage whose pools have bouts cannot be deleted", errs.ErrConflict))
		}
		return fmt.Errorf("delete pool stage %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetPoolStageByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("delete pool stage %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func translatePoolStageWriteError(op string, err error) error {
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("event_id does not reference an existing record", errs.ErrInvalidInput))
	}
	if errors.Is(err, gorm.ErrCheckConstraintViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("pool stage fields violate a constraint", errs.ErrInvalidInput))
	}

	return fmt.Errorf("%s: %w", op, err)
}
