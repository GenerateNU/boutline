package user

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepository interface {
	CreateUser(ctx context.Context, user *User) error
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	ListUsers(ctx context.Context, filter UserListFilter) ([]User, int64, error)
	UpdateUserByID(ctx context.Context, id uuid.UUID, update UserUpdate) error
	DeleteUser(ctx context.Context, id uuid.UUID) error
}

// Any non-nil fields to be applied as updates
type UserUpdate struct {
	Email     *string
	Password  *string
	FirstName *string
	LastName  *string
}

// TODO: ability to list by name or other fuzzy search?
type UserListFilter struct {
	Limit  int
	Offset int
}

type userRepository struct {
	db *gorm.DB
}

func (u UserUpdate) columns() map[string]any {
	columns := make(map[string]any, 4)

	if u.Email != nil {
		columns["email"] = *u.Email
	}
	if u.Password != nil {
		columns["password"] = *u.Password
	}
	if u.FirstName != nil {
		columns["first_name"] = *u.FirstName
	}
	if u.LastName != nil {
		columns["last_name"] = *u.LastName
	}

	return columns
}

func (r *userRepository) CreateUser(ctx context.Context, user *User) error {
	if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create user: %w", errs.ErrDuplicate)
		}
		return fmt.Errorf("create user: %w", err)
	}

	return nil
}

func (r *userRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var user User

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select user %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select user %s: %w", id, err)
	}

	return &user, nil
}

func (r *userRepository) UpdateUserByID(ctx context.Context, id uuid.UUID, update UserUpdate) error {
	result := r.db.WithContext(ctx).Model(&User{}).Where("id = ?", id).Updates(update.columns())
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("update user %s: %w", id, errs.ErrDuplicate)
		}
		return fmt.Errorf("update user %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("update user %s: %w", id, errs.ErrNotFound)
	}

	return nil
}

func (r *userRepository) ListUsers(ctx context.Context, filter UserListFilter) ([]User, int64, error) {
	query := r.db.WithContext(ctx).Model(&User{})
	// TODO: how do we want to be able to search for users?
	// if filter.Status != "" {
	// 	query = query.Where("status = ?", filter.Status)
	// }

	// Counted before the page is fetched so the caller gets a total without a
	// second round trip through the same filter.
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	users := make([]User, 0, filter.Limit)
	err := query.
		Select("id").
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&users).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select users: %w", err)
	}

	return users, total, nil
}

func (r *userRepository) DeleteUser(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&User{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("delete user %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("delete user %s: %w", id, errs.ErrNotFound)
	}

	return nil
}