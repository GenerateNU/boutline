package tournamentuser

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TournamentUserRepository interface {
	CreateTournamentUser(ctx context.Context, membership *TournamentUser) error
	ListTournamentUsers(ctx context.Context, tournamentID uuid.UUID) ([]TournamentUser, error)
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
) ([]TournamentUser, error) {
	var memberships []TournamentUser

	err := r.db.WithContext(ctx).
		Where("tournament_id = ?", tournamentID).
		Order("created_at").
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
