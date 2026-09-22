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