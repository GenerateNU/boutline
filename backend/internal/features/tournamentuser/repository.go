package tournamentuser

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TournamentUserRepository interface {
	CreateTournamentUser(ctx context.Context, membership *TournamentUser) error
	GetTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) (*TournamentUser, error)
	ListUsersByTournament(ctx context.Context, tournamentID uuid.UUID, limit, offset int) ([]TournamentUser, error)
	CountUsersByTournament(ctx context.Context, tournamentID uuid.UUID) (int64, error)
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
		return utils.TranslateWriteError("create tournament user", TournamentUser{}.TableName(),
			"user_id and tournament_id must reference an existing user and tournament", err)
	}

	return nil
}

func (r *tournamentUserRepository) ListUsersByTournament(
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
		return nil, fmt.Errorf("select users in tournament %s: %w", tournamentID, err)
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
		return utils.TranslateWriteError(fmt.Sprintf("update tournament user %s/%s", tournamentID, userID),
			TournamentUser{}.TableName(), "", result.Error)
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
		return nil, utils.TranslateReadError(fmt.Sprintf("select tournament user %s/%s", tournamentID, userID), err)
	}

	return &membership, nil
}

func (r *tournamentUserRepository) CountUsersByTournament(
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
