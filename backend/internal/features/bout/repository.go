package bout

import (
	"context"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BoutRepository interface {
	CreateBout(ctx context.Context, bout *Bout) error
	GetBoutByID(ctx context.Context, id uuid.UUID) (*Bout, error)
	ListBouts(ctx context.Context, filter BoutListFilter) ([]Bout, int64, error)
	UpdateBoutByID(ctx context.Context, id uuid.UUID, update BoutUpdate) error
	TransitionBoutByID(ctx context.Context, id uuid.UUID, transition BoutTransition) error
	DeleteBoutByID(ctx context.Context, id uuid.UUID) error
}

type BoutUpdate struct {
	Location         *string
	StartTime        *time.Time
	RefereeID        *uuid.UUID
	PoolID           *uuid.UUID
	TimeLimitSeconds *int
	PointsToWin      *int
	GroupNumber      *int
	Competitor1ID    *uuid.UUID
	Competitor2ID    *uuid.UUID
}

func (e BoutUpdate) columns() map[string]any {
	columns := make(map[string]any, 9)

	if e.Location != nil {
		columns["location"] = *e.Location
	}
	if e.StartTime != nil {
		columns["start_time"] = *e.StartTime
	}
	if e.RefereeID != nil {
		columns["referee_id"] = *e.RefereeID
	}
	if e.PoolID != nil {
		columns["pool_id"] = *e.PoolID
	}
	if e.TimeLimitSeconds != nil {
		columns["time_limit_seconds"] = *e.TimeLimitSeconds
	}
	if e.PointsToWin != nil {
		columns["points_to_win"] = *e.PointsToWin
	}
	if e.GroupNumber != nil {
		columns["group_number"] = *e.GroupNumber
	}
	if e.Competitor1ID != nil {
		columns["competitor_1_id"] = *e.Competitor1ID
	}
	if e.Competitor2ID != nil {
		columns["competitor_2_id"] = *e.Competitor2ID
	}

	return columns
}

type BoutTransition struct {
	To          BoutStatus
	StartedAt   *time.Time
	CompletedAt *time.Time
	From        []BoutStatus
}

func (t BoutTransition) columns() map[string]any {
	columns := map[string]any{"status": t.To}
	if t.StartedAt != nil {
		columns["started_at"] = *t.StartedAt
	}
	if t.CompletedAt != nil {
		columns["completed_at"] = *t.CompletedAt
	}

	return columns
}

type BoutListFilter struct {
	TournamentID *uuid.UUID
	PoolID       *uuid.UUID
	Status       BoutStatus
	Limit        int
	Offset       int
}

const boutForeignKeyMessage = "tournament_id, referee_id, or a competitor id does not reference an existing record"

type boutRepository struct {
	db *gorm.DB
}

func NewBoutRepository(db *gorm.DB) BoutRepository {
	return &boutRepository{db: db}
}

func (r *boutRepository) CreateBout(ctx context.Context, bout *Bout) error {
	if err := r.db.WithContext(ctx).Create(bout).Error; err != nil {
		return utils.TranslateWriteError("create bout", Bout{}.TableName(), boutForeignKeyMessage, err)
	}

	return nil
}

func (r *boutRepository) GetBoutByID(ctx context.Context, id uuid.UUID) (*Bout, error) {
	var bout Bout

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&bout).Error
	if err != nil {
		return nil, utils.TranslateReadError(fmt.Sprintf("select bout %s", id), err)
	}

	return &bout, nil
}

func (r *boutRepository) ListBouts(ctx context.Context, filter BoutListFilter) ([]Bout, int64, error) {
	query := r.db.WithContext(ctx).Model(&Bout{})
	if filter.TournamentID != nil {
		query = query.Where("tournament_id = ?", *filter.TournamentID)
	}
	if filter.PoolID != nil {
		query = query.Where("pool_id = ?", *filter.PoolID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count bouts: %w", err)
	}

	bouts := make([]Bout, 0, filter.Limit)
	err := query.
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&bouts).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select bouts: %w", err)
	}

	return bouts, total, nil
}

func (r *boutRepository) UpdateBoutByID(ctx context.Context, id uuid.UUID, update BoutUpdate) error {
	return r.updateByID(ctx, id, update.columns(), BoutEditableStatuses())
}

func (r *boutRepository) TransitionBoutByID(ctx context.Context, id uuid.UUID, transition BoutTransition) error {
	return r.updateByID(ctx, id, transition.columns(), transition.From)
}

func (r *boutRepository) updateByID(
	ctx context.Context,
	id uuid.UUID,
	columns map[string]any,
	allowedStatuses []BoutStatus,
) error {
	query := r.db.WithContext(ctx).Model(&Bout{}).Where("id = ?", id)
	if len(allowedStatuses) > 0 {
		query = query.Where("status IN ?", allowedStatuses)
	}

	result := query.Updates(columns)
	if result.Error != nil {
		return utils.TranslateWriteError(fmt.Sprintf("update bout %s", id), Bout{}.TableName(),
			boutForeignKeyMessage, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetBoutByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update bout %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *boutRepository) DeleteBoutByID(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND status IN ?", id, BoutDeletableStatuses()).
		Delete(&Bout{})
	if result.Error != nil {
		return utils.TranslateDeleteError(fmt.Sprintf("delete bout %s", id),
			"a bout with scoring cannot be deleted", result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetBoutByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("delete bout %s: %w", id, errs.Public("an active bout cannot be deleted", errs.ErrConflict))
	}

	return nil
}
