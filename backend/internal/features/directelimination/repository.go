package directelimination

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DirectEliminationRepository interface {
	CreateDirectElimination(ctx context.Context, de *DirectElimination) error
	GetDirectEliminationByID(ctx context.Context, id uuid.UUID) (*DirectElimination, error)
	ListDirectElimination(ctx context.Context, filter DirectEliminationListFilter) ([]DirectElimination, error)
	EditDirectEliminationByID(ctx context.Context, id uuid.UUID, edit DirectEliminationEdit) error
	TransitionDirectEliminationByID(ctx context.Context, id uuid.UUID, transition DirectEliminationTransition) error
	DeleteDirectElimination(ctx context.Context, id uuid.UUID) error
}

type DirectEliminationEdit struct {
	EventID *uuid.UUID
}

func (e DirectEliminationEdit) columns() map[string]any {
	columns := make(map[string]any, 1)

	if e.EventID != nil {
		columns["event_id"] = *e.EventID
	}

	return columns
}

type DirectEliminationTransition struct {
	To          Status
	StartedAt   *time.Time
	CompletedAt *time.Time
	From        []Status
}

func (t DirectEliminationTransition) columns() map[string]any {
	columns := map[string]any{"status": t.To}
	if t.StartedAt != nil {
		columns["started_at"] = *t.StartedAt
	}
	if t.CompletedAt != nil {
		columns["completed_at"] = *t.CompletedAt
	}

	return columns
}

type DirectEliminationListFilter struct {
	EventID *uuid.UUID
	Status  *Status
}

type directEliminationRepository struct {
	db *gorm.DB
}

func NewDirectEliminationRepository(db *gorm.DB) DirectEliminationRepository {
	return &directEliminationRepository{db: db}
}

func (r *directEliminationRepository) CreateDirectElimination(
	ctx context.Context,
	de *DirectElimination,
) error {
	if err := r.db.WithContext(ctx).Create(de).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create direct elimination: %w", errs.ErrDuplicate)
		}
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("create direct elimination: %w",
				errs.Public("event_id must reference an existing event", errs.ErrInvalidInput))
		}
		return fmt.Errorf("create direct elimination: %w", err)
	}

	return nil
}

func (r *directEliminationRepository) GetDirectEliminationByID(
	ctx context.Context,
	id uuid.UUID,
) (*DirectElimination, error) {
	var de DirectElimination

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&de).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select direct elimination %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select direct elimination %s: %w", id, err)
	}

	return &de, nil
}

func (r *directEliminationRepository) ListDirectElimination(
	ctx context.Context,
	filter DirectEliminationListFilter,
) ([]DirectElimination, error) {
	query := r.db.WithContext(ctx).Model(&DirectElimination{})
	if filter.EventID != nil {
		query = query.Where("event_id = ?", *filter.EventID)
	}
	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}

	rounds := make([]DirectElimination, 0)
	if err := query.Order("created_at DESC").Find(&rounds).Error; err != nil {
		return nil, fmt.Errorf("select direct eliminations: %w", err)
	}

	return rounds, nil
}

func (r *directEliminationRepository) EditDirectEliminationByID(
	ctx context.Context,
	id uuid.UUID,
	edit DirectEliminationEdit,
) error {
	return r.updateByID(ctx, id, edit.columns(), DirectEliminationEditableStatuses())
}

func (r *directEliminationRepository) TransitionDirectEliminationByID(
	ctx context.Context,
	id uuid.UUID,
	transition DirectEliminationTransition,
) error {
	return r.updateByID(ctx, id, transition.columns(), transition.From)
}

// updateByID applies columns only while the row is in one of allowedStatuses,
// so the status check and the write happen in a single statement. Zero rows
// affected means either the row is missing (not found) or it is in a status
// that does not allow the change (conflict).
func (r *directEliminationRepository) updateByID(
	ctx context.Context,
	id uuid.UUID,
	columns map[string]any,
	allowedStatuses []Status,
) error {
	query := r.db.WithContext(ctx).Model(&DirectElimination{}).Where("id = ?", id)
	if len(allowedStatuses) > 0 {
		query = query.Where("status IN ?", allowedStatuses)
	}

	result := query.Updates(columns)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("update direct elimination %s: %w", id,
				errs.Public("event_id must reference an existing event", errs.ErrInvalidInput))
		}
		return fmt.Errorf("update direct elimination %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetDirectEliminationByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update direct elimination %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *directEliminationRepository) DeleteDirectElimination(
	ctx context.Context,
	id uuid.UUID,
) error {
	result := r.db.WithContext(ctx).Where("id = ?", id).Delete(&DirectElimination{})
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("delete direct elimination %s: %w", id,
				errs.Public("direct elimination round is still referenced and cannot be deleted", errs.ErrConflict))
		}
		return fmt.Errorf("delete direct elimination %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("delete direct elimination %s: %w", id, errs.ErrNotFound)
	}

	return nil
}
