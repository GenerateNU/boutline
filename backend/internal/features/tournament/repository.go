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
	EditTournamentByID(ctx context.Context, id uuid.UUID, edit TournamentEdit) error
	TransitionTournamentByID(ctx context.Context, id uuid.UUID, transition TournamentTransition) error
}

type TournamentEdit struct {
	Name       *string
	Visibility *TournamentVisibility
	StartTime  *time.Time
}

func (e TournamentEdit) columns() map[string]any {
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
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create tournament: %w", errs.ErrDuplicate)
		}
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("create tournament: %w",
				errs.Public("created_by must reference an existing user", errs.ErrInvalidInput))
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

func (r *tournamentRepository) EditTournamentByID(
	ctx context.Context,
	id uuid.UUID,
	edit TournamentEdit,
) error {
	return r.updateByID(ctx, id, edit.columns(), TournamentEditableStatuses())
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

type TournamentUserRepository interface {
	CreateTournamentUser(ctx context.Context, membership *TournamentUser) error
	GetTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) (*TournamentUser, error)
	ListTournamentUsers(ctx context.Context, tournamentID uuid.UUID, limit, offset int) ([]TournamentUser, error)
	CountUsersInTournament(ctx context.Context, tournamentID uuid.UUID) (int64, error)
	ListTournamentsByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Tournament, int64, error)
	UpdateTournamentUserRole(ctx context.Context, tournamentID, userID uuid.UUID, role TournamentUserRole) error
	DeleteTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) error
}

type tournamentUserRepository struct {
	db *gorm.DB
}

func NewTournamentUserRepository(db *gorm.DB) TournamentUserRepository {
	return &tournamentUserRepository{db: db}
}

func (r *tournamentUserRepository) CreateTournamentUser(ctx context.Context, membership *TournamentUser) error {
	if err := r.db.WithContext(ctx).Create(membership).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create tournament user: %w", errs.ErrDuplicate)
		}
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("create tournament user: %w",
				errs.Public("user_id and tournament_id must reference an existing user and tournament",
					errs.ErrInvalidInput))
		}
		return fmt.Errorf("create tournament user: %w", err)
	}

	return nil
}

func (r *tournamentUserRepository) ListTournamentUsers(
	ctx context.Context,
	tournamentID uuid.UUID,
	limit int,
	offset int,
) ([]TournamentUser, error) {
	var memberships []TournamentUser

	err := r.db.WithContext(ctx).
		Where("tournament_id = ?", tournamentID).
		Order("created_at, user_id").
		Limit(limit).
		Offset(offset).
		Find(&memberships).Error
	if err != nil {
		return nil, fmt.Errorf("select tournament users for %s: %w", tournamentID, err)
	}

	return memberships, nil
}

func (r *tournamentUserRepository) UpdateTournamentUserRole(
	ctx context.Context,
	tournamentID, userID uuid.UUID,
	role TournamentUserRole,
) error {
	result := r.db.WithContext(ctx).
		Model(&TournamentUser{}).
		Where("tournament_id = ? AND user_id = ?", tournamentID, userID).
		Update("role", role)
	if result.Error != nil {
		return fmt.Errorf("update tournament user %s/%s: %w", tournamentID, userID, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("update tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
	}

	return nil
}

func (r *tournamentUserRepository) DeleteTournamentUser(
	ctx context.Context,
	tournamentID, userID uuid.UUID,
) error {
	result := r.db.WithContext(ctx).
		Where("tournament_id = ? AND user_id = ?", tournamentID, userID).
		Delete(&TournamentUser{})
	if result.Error != nil {
		return fmt.Errorf("delete tournament user %s/%s: %w", tournamentID, userID, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("delete tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
	}

	return nil
}

func (r *tournamentUserRepository) GetTournamentUser(
	ctx context.Context,
	tournamentID, userID uuid.UUID,
) (*TournamentUser, error) {
	var membership TournamentUser

	err := r.db.WithContext(ctx).
		Where("tournament_id = ? AND user_id = ?", tournamentID, userID).
		First(&membership).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select tournament user %s/%s: %w", tournamentID, userID, err)
	}

	return &membership, nil
}

func (r *tournamentUserRepository) CountUsersInTournament(
	ctx context.Context,
	tournamentID uuid.UUID,
) (int64, error) {
	var total int64

	err := r.db.WithContext(ctx).
		Model(&TournamentUser{}).
		Where("tournament_id = ?", tournamentID).
		Count(&total).Error
	if err != nil {
		return 0, fmt.Errorf("count users in tournament %s: %w", tournamentID, err)
	}

	return total, nil
}

func (r *tournamentUserRepository) ListTournamentsByUser(
	ctx context.Context,
	userID uuid.UUID,
	limit, offset int,
) ([]Tournament, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&Tournament{}).
		Joins("JOIN tournament_users ON tournament_users.tournament_id = tournaments.id").
		Where("tournament_users.user_id = ?", userID)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count tournaments for user %s: %w", userID, err)
	}

	tournaments := make([]Tournament, 0, limit)
	err := query.
		Select("tournaments.*").
		Order("tournaments.created_at DESC, tournaments.id").
		Limit(limit).
		Offset(offset).
		Find(&tournaments).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select tournaments for user %s: %w", userID, err)
	}

	return tournaments, total, nil
}
