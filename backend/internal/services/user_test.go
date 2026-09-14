package services_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/models"
	"boutline/internal/services"
	"boutline/internal/tests/mocks"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func validUserRequest() models.CreateUserRequest {
	lastName := "Lovelace"

	return models.CreateUserRequest{
		Email:     "Ada@Boutline.TEST",
		Password:  "password123",
		FirstName: "Ada",
		LastName:  &lastName,
	}
}

func TestCreateUser(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		seed    []models.User
		mutate  func(*models.CreateUserRequest)
		wantErr error
	}{
		{
			name:   "valid account",
			mutate: func(*models.CreateUserRequest) {},
		},
		{
			name:    "duplicate email after normalization",
			seed:    []models.User{{Email: "ada@boutline.test"}},
			mutate:  func(*models.CreateUserRequest) {},
			wantErr: errs.ErrDuplicate,
		},
		{
			name:    "email without an @",
			mutate:  func(r *models.CreateUserRequest) { r.Email = "not-an-email" },
			wantErr: errs.ErrInvalidInput,
		},
		{
			name:    "blank email",
			mutate:  func(r *models.CreateUserRequest) { r.Email = "   " },
			wantErr: errs.ErrInvalidInput,
		},
		{
			name:    "whitespace-only first name",
			mutate:  func(r *models.CreateUserRequest) { r.FirstName = "  " },
			wantErr: errs.ErrInvalidInput,
		},
		{
			name:    "password below the minimum",
			mutate:  func(r *models.CreateUserRequest) { r.Password = "short" },
			wantErr: errs.ErrInvalidInput,
		},
		{
			name: "password past bcrypt's 72-byte ceiling",
			mutate: func(r *models.CreateUserRequest) {
				r.Password = strings.Repeat("a", services.UserMaxPasswordLength+1)
			},
			wantErr: errs.ErrInvalidInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			req := validUserRequest()
			tt.mutate(&req)

			svc := services.NewUserService(mocks.NewMockUserRepository(tt.seed...))
			got, err := svc.CreateUser(context.Background(), req)

			if tt.wantErr != nil {
				require.Error(t, err)
				assert.True(t, errors.Is(err, tt.wantErr), "got %v", err)

				return
			}

			require.NoError(t, err)
			assert.NotEqual(t, uuid.Nil, got.ID)
			assert.Equal(t, "ada@boutline.test", got.Email, "email is stored normalized")
			assert.Equal(t, "Ada", got.FirstName)
			assert.False(t, got.CreatedAt.IsZero())
		})
	}
}

// last_name is the optional column, so absent and whitespace-only both have to
// land on NULL rather than an empty string.
func TestCreateUserLastName(t *testing.T) {
	t.Parallel()

	blank := "   "
	padded := "  Lovelace  "

	tests := []struct {
		name  string
		given *string
		want  *string
	}{
		{name: "omitted stores null", given: nil, want: nil},
		{name: "whitespace-only stores null", given: &blank, want: nil},
		{name: "surrounding whitespace is trimmed", given: &padded, want: ptr("Lovelace")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			req := validUserRequest()
			req.LastName = tt.given

			svc := services.NewUserService(mocks.NewMockUserRepository())
			got, err := svc.CreateUser(context.Background(), req)
			require.NoError(t, err)

			if tt.want == nil {
				assert.Nil(t, got.LastName)

				return
			}

			require.NotNil(t, got.LastName)
			assert.Equal(t, *tt.want, *got.LastName)
		})
	}
}

func TestCreateUserHashesPassword(t *testing.T) {
	t.Parallel()

	svc := services.NewUserService(mocks.NewMockUserRepository())
	got, err := svc.CreateUser(context.Background(), validUserRequest())
	require.NoError(t, err)

	assert.NotEqual(t, "password123", got.Password, "the plaintext must not be stored")
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(got.Password), []byte("password123")))
	assert.Error(t, bcrypt.CompareHashAndPassword([]byte(got.Password), []byte("wrong-password")))

	cost, err := bcrypt.Cost([]byte(got.Password))
	require.NoError(t, err)
	assert.Equal(t, services.UserBcryptCost, cost)
}

func ptr(s string) *string {
	return &s
}
