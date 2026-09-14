package tests

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
	return models.CreateUserRequest{
		Email:     "Ada@Boutline.TEST",
		Password:  "password123",
		FirstName: "Ada",
		LastName:  "Lovelace",
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
			name:    "blank first name",
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
				assert.True(t, errors.Is(err, tt.wantErr))
				return
			}

			require.NoError(t, err)
			assert.NotEqual(t, uuid.Nil, got.ID)
			assert.Equal(t, "ada@boutline.test", got.Email, "email is stored normalized")
			assert.False(t, got.CreatedAt.IsZero())
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

// The column is NOT NULL, and a nil pq.StringArray writes SQL NULL rather than
// an empty array, so the service has to substitute one.
func TestCreateUserDefaultsCertificationToEmpty(t *testing.T) {
	t.Parallel()

	svc := services.NewUserService(mocks.NewMockUserRepository())

	got, err := svc.CreateUser(context.Background(), validUserRequest())
	require.NoError(t, err)
	assert.NotNil(t, got.Certification)
	assert.Empty(t, got.Certification)

	req := validUserRequest()
	req.Email = "grace@boutline.test"
	req.Certification = []string{"CPR", "First Aid"}

	withCerts, err := svc.CreateUser(context.Background(), req)
	require.NoError(t, err)
	assert.Equal(t, []string{"CPR", "First Aid"}, []string(withCerts.Certification))
}

func TestGetUserByEmail(t *testing.T) {
	t.Parallel()

	svc := services.NewUserService(mocks.NewMockUserRepository())
	created, err := svc.CreateUser(context.Background(), validUserRequest())
	require.NoError(t, err)

	t.Run("lookup normalizes the address", func(t *testing.T) {
		t.Parallel()

		got, err := svc.GetUserByEmail(context.Background(), "  ADA@boutline.TEST ")
		require.NoError(t, err)
		assert.Equal(t, created.ID, got.ID)
	})

	t.Run("unknown address is not found", func(t *testing.T) {
		t.Parallel()

		_, err := svc.GetUserByEmail(context.Background(), "nobody@boutline.test")
		require.Error(t, err)
		assert.True(t, errors.Is(err, errs.ErrNotFound))
	})
}
