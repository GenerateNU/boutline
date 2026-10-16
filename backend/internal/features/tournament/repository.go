package tournament

import (
	"context"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TournamentRepository interface {
	CreateTournament(ctx context.Context, tournament *Tournament) error
	GetTournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error)
	GetTournamentByCode(ctx context.Context, code string) (*Tournament, error)
	ListTournaments(ctx context.Context, filter TournamentListFilter) ([]Tournament, int64, error)
	UpdateTournamentByID(ctx context.Context, id uuid.UUID, update TournamentUpdate) error
	TransitionTournamentByID(ctx context.Context, id uuid.UUID, transition TournamentTransition) error
}

type TournamentUpdate struct {
	Name       *string
	Visibility *TournamentVisibility
	StartTime  *time.Time
}

func (e TournamentUpdate) columns() map[string]any {
	columns := make(map[string]any, 3)

	if e.Name != nil {
		columns["name"] = *e.Name
	}
	if e.Visibility != nil {
		columns["visibility"] = *e.Visibility
	}
	if e.StartTime != nil {
		columns["start_time"] = *e.StartTime
	}

	return columns
}

type TournamentTransition struct {
	To          TournamentStatus
	StartedAt   *time.Time
	CompletedAt *time.Time
	From        []TournamentStatus
}

func (t TournamentTransition) columns() map[string]any {
	columns := map[string]any{"status": t.To}
	if t.StartedAt != nil {
		columns["started_at"] = *t.StartedAt
	}
	if t.CompletedAt != nil {
		columns["completed_at"] = *t.CompletedAt
	}

	return columns
}

// TODO: support timestamp filtering (started_at ranges)
type TournamentListFilter struct {
	Status TournamentStatus
	Limit  int
	Offset int
}

type tournamentRepository struct {
	db *gorm.DB
}

func NewTournamentRepository(db *gorm.DB) TournamentRepository {
	return &tournamentRepository{db: db}
}

func (r *tournamentRepository) CreateTournament(ctx context.Context, tournament *Tournament) error {
	if err := r.db.WithContext(ctx).Create(tournament).Error; err != nil {
		return utils.TranslateWriteError("create tournament", Tournament{}.TableName(),
			"created_by must reference an existing user", err)
	}

	return nil
}

func (r *tournamentRepository) GetTournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error) {
	var tournament Tournament

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&tournament).Error
	if err != nil {
		return nil, utils.TranslateReadError(fmt.Sprintf("select tournament %s", id), err)
	}

	return &tournament, nil
}

func (r *tournamentRepository) GetTournamentByCode(ctx context.Context, code string) (*Tournament, error) {
	var tournament Tournament

	err := r.db.WithContext(ctx).Where("code = ?", code).First(&tournament).Error
	if err != nil {
		return nil, utils.TranslateReadError("select tournament by code", err)
	}

	return &tournament, nil
}

func (r *tournamentRepository) UpdateTournamentByID(
	ctx context.Context,
	id uuid.UUID,
	update TournamentUpdate,
) error {
	return r.updateByID(ctx, id, update.columns(), TournamentEditableStatuses())
}

func (r *tournamentRepository) TransitionTournamentByID(
	ctx context.Context,
	id uuid.UUID,
	transition TournamentTransition,
) error {
	return r.updateByID(ctx, id, transition.columns(), transition.From)
}

func (r *tournamentRepository) updateByID(
	ctx context.Context,
	id uuid.UUID,
	columns map[string]any,
	allowedStatuses []TournamentStatus,
) error {
	query := r.db.WithContext(ctx).Model(&Tournament{}).Where("id = ?", id)
	if len(allowedStatuses) > 0 {
		query = query.Where("status IN ?", allowedStatuses)
	}

	result := query.Updates(columns)
	if result.Error != nil {
		return utils.TranslateWriteError(fmt.Sprintf("update tournament %s", id), Tournament{}.TableName(),
			"created_by must reference an existing user", result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetTournamentByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update tournament %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *tournamentRepository) ListTournaments(ctx context.Context, filter TournamentListFilter) ([]Tournament, int64, error) {
	query := r.db.WithContext(ctx).Model(&Tournament{})
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count tournaments: %w", err)
	}

	tournaments := make([]Tournament, 0, filter.Limit)
	err := query.
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&tournaments).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select tournaments: %w", err)
	}

	return tournaments, total, nil
}
