package services

import (
	"context"
	"fmt"
	"strings"

	"boutline/internal/errs"
	"boutline/internal/models"
	"boutline/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

const (
	// Above bcrypt's default of 10: each increment doubles what a guess costs.
	UserBcryptCost = 12

	UserMinPasswordLength = 8
	// bcrypt ignores everything past 72 bytes, so a longer password would be
	// silently truncated and two different ones could share a hash. Reject
	// instead of truncating.
	UserMaxPasswordLength = 72
)

type UserService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

// NormalizeUserEmail is the single definition of how an address is stored and
// looked up; the unique index is over the normalized form, so every caller has
// to go through it or they will disagree about who already exists.
func NormalizeUserEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func (s *UserService) CreateUser(ctx context.Context, req models.CreateUserRequest) (*models.User, error) {
	email := NormalizeUserEmail(req.Email)
	firstName := strings.TrimSpace(req.FirstName)

	if email == "" || !strings.Contains(email, "@") {
		return nil, fmt.Errorf("create user: %w",
			errs.Public("email must be a valid address", errs.ErrInvalidInput))
	}

	if firstName == "" {
		return nil, fmt.Errorf("create user: %w",
			errs.Public("first name is required", errs.ErrInvalidInput))
	}

	if len(req.Password) < UserMinPasswordLength || len(req.Password) > UserMaxPasswordLength {
		return nil, fmt.Errorf("create user: %w", errs.Public(
			fmt.Sprintf("password must be between %d and %d characters",
				UserMinPasswordLength, UserMaxPasswordLength),
			errs.ErrInvalidInput))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), UserBcryptCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &models.User{
		Email:     email,
		Password:  string(hash),
		FirstName: firstName,
		LastName:  trimOptionalName(req.LastName),
	}
	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// An absent last name and one that is only whitespace both store NULL, so no
// reader has to treat "" as a third state for "no last name".
func trimOptionalName(name *string) *string {
	if name == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*name)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}
