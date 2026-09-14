package repository

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/models"

	"gorm.io/gorm"
)

type UserRepository interface {
	CreateUser(ctx context.Context, user *models.User) error
}

var _ UserRepository = (*userRepository)(nil)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

// The unique index on email is what rejects a second sign-up; gorm's
// TranslateError turns the driver's violation into ErrDuplicatedKey, so this
// stays the only place that knows how Postgres phrases it.
func (r *userRepository) CreateUser(ctx context.Context, user *models.User) error {
	if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create user: %w", errs.ErrDuplicate)
		}
		return fmt.Errorf("create user: %w", err)
	}

	return nil
}
