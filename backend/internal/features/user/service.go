package user

import (
	"context"
	"fmt"
	"strings"

	"boutline/internal/errs"

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
	repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
	return &UserService{repo: repo}
}

// NormalizeUserEmail is the single definition of how an address is stored and
// looked up; the unique index is over the normalized form, so sign-up and
// sign-in must both go through it or they will disagree about who exists.
func NormalizeUserEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

type UserCreateParams struct {
	Email     string
	Password  string
	FirstName string
	LastName  string
	// Empty for a sign-up; the seed and later profile edits are what fill it.
	Certification []string
}

func (s *UserService) CreateUser(ctx context.Context, params UserCreateParams) (*User, error) {
	email := NormalizeUserEmail(params.Email)
	firstName := strings.TrimSpace(params.FirstName)
	lastName := strings.TrimSpace(params.LastName)
	password := params.Password

	if email == "" || !strings.Contains(email, "@") {
		return nil, fmt.Errorf("create user: %w", errs.Public("email must be a valid address", errs.ErrInvalidInput))
	}
	if firstName == "" || lastName == "" {
		return nil, fmt.Errorf("create user: %w", errs.Public("first and last name are required", errs.ErrInvalidInput))
	}
	if len(password) < UserMinPasswordLength || len(password) > UserMaxPasswordLength {
		return nil, fmt.Errorf("create user: %w", errs.Public(
			fmt.Sprintf("password must be between %d and %d characters", UserMinPasswordLength, UserMaxPasswordLength),
			errs.ErrInvalidInput))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), UserBcryptCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	// Never nil: the column is NOT NULL, and a nil pq.StringArray writes SQL
	// NULL rather than an empty array.
	certification := params.Certification
	if certification == nil {
		certification = []string{}
	}

	user := &User{
		Email:         email,
		Password:      string(hash),
		FirstName:     firstName,
		LastName:      lastName,
		Certification: certification,
	}
	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *UserService) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	return s.repo.FindUserByEmail(ctx, NormalizeUserEmail(email))
}
