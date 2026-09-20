package tournament

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TournamentRepository interface {
	CreateTournament(ctx context.Context, tournament *Tournament) error
	GetTournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error)
	GetTournamentByCode(ctx context.Context, code string) (*Tournament, error)
	ListTournaments(ctx context.Context, filter TournamentListFilter) ([]Tournament, int64, error)
	UpdateTournamentByID(ctx context.Context, id uuid.UUID, update TournamentUpdate) error
}

type TournamentUpdate struct {
	Name            *string
	Visibility      *TournamentVisibility
	Status          *TournamentStatus
	CompletedAt     *time.Time
	AllowedStatuses []TournamentStatus
}

func (u TournamentUpdate) columns() map[string]any {
	columns := make(map[string]any, 4)

	if u.Name != nil {
		columns["name"] = *u.Name
	}
	if u.Visibility != nil {
		columns["visibility"] = *u.Visibility
	}
	if u.Status != nil {
		columns["status"] = *u.Status
	}
	if u.CompletedAt != nil {
		columns["completed_at"] = *u.CompletedAt
	}

	return columns
}

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
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create tournament: %w", errs.ErrDuplicate)
		}
		return fmt.Errorf("create tournament: %w", err)
	}

	return nil
}

func (r *tournamentRepository) GetTournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error) {
	var tournament Tournament

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&tournament).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select tournament %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select tournament %s: %w", id, err)
	}

	return &tournament, nil
}

func (r *tournamentRepository) GetTournamentByCode(ctx context.Context, code string) (*Tournament, error) {
	var tournament Tournament

	err := r.db.WithContext(ctx).Where("code = ?", code).First(&tournament).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select tournament by code: %w", errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select tournament by code: %w", err)
	}

	return &tournament, nil
}

func (r *tournamentRepository) UpdateTournamentByID(
	ctx context.Context,
	id uuid.UUID,
	update TournamentUpdate,
) error {
	query := r.db.WithContext(ctx).Model(&Tournament{}).Where("id = ?", id)
	if len(update.AllowedStatuses) > 0 {
		query = query.Where("status IN ?", update.AllowedStatuses)
	}

	result := query.Updates(update.columns())
	if result.Error != nil {
		return fmt.Errorf("update tournament %s: %w", id, result.Error)
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
