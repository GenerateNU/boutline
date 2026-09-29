package tournamentuser

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/tournament"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TournamentUserRepository interface {
	CreateTournamentUser(ctx context.Context, membership *TournamentUser) error
	GetTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) (*TournamentUser, error)
	ListTournamentUsers(ctx context.Context, tournamentID uuid.UUID, limit, offset int) ([]TournamentUser, error)
	CountTournamentUsers(ctx context.Context, tournamentID uuid.UUID) (int64, error)
	ListTournamentsByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]tournament.Tournament, int64, error)
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

func (r *tournamentUserRepository) CountTournamentUsers(
	ctx context.Context,
	tournamentID uuid.UUID,
) (int64, error) {
	var total int64

	err := r.db.WithContext(ctx).
		Model(&TournamentUser{}).
		Where("tournament_id = ?", tournamentID).
		Count(&total).Error
	if err != nil {
		return 0, fmt.Errorf("count tournament users for %s: %w", tournamentID, err)
	}

	return total, nil
}

func (r *tournamentUserRepository) ListTournamentsByUser(
	ctx context.Context,
	userID uuid.UUID,
	limit, offset int,
) ([]tournament.Tournament, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&tournament.Tournament{}).
		Joins("JOIN tournament_users ON tournament_users.tournament_id = tournaments.id").
		Where("tournament_users.user_id = ?", userID)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count tournaments for user %s: %w", userID, err)
	}

	tournaments := make([]tournament.Tournament, 0, limit)
	err := query.
		Select("tournaments.*").
		Order("tournaments.created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&tournaments).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select tournaments for user %s: %w", userID, err)
	}

	return tournaments, total, nil
}
