package test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/features/user"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func validParams() user.UserCreateParams {
	return user.UserCreateParams{
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
		seed    []user.User
		mutate  func(*user.UserCreateParams)
		wantErr error
	}{
		{
			name:   "valid account",
			mutate: func(*user.UserCreateParams) {},
		},
		{
			name:    "duplicate email after normalization",
			seed:    []user.User{{Email: "ada@boutline.test"}},
			mutate:  func(*user.UserCreateParams) {},
			wantErr: errs.ErrDuplicate,
		},
		{
			name:    "email without an @",
			mutate:  func(p *user.UserCreateParams) { p.Email = "not-an-email" },
			wantErr: errs.ErrInvalidInput,
		},
		{
			name:    "blank email",
			mutate:  func(p *user.UserCreateParams) { p.Email = "   " },
			wantErr: errs.ErrInvalidInput,
		},
		{
			name:    "blank first name",
			mutate:  func(p *user.UserCreateParams) { p.FirstName = "  " },
			wantErr: errs.ErrInvalidInput,
		},
		{
			name:    "password below the minimum",
			mutate:  func(p *user.UserCreateParams) { p.Password = "short" },
			wantErr: errs.ErrInvalidInput,
		},
		{
			name: "password past bcrypt's 72-byte ceiling",
			mutate: func(p *user.UserCreateParams) {
				p.Password = strings.Repeat("a", user.UserMaxPasswordLength+1)
			},
			wantErr: errs.ErrInvalidInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			params := validParams()
			tt.mutate(&params)

			svc := user.NewUserService(NewFakeUserRepository(tt.seed...))
			got, err := svc.CreateUser(context.Background(), params)

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

	svc := user.NewUserService(NewFakeUserRepository())
	got, err := svc.CreateUser(context.Background(), validParams())
	require.NoError(t, err)

	assert.NotEqual(t, "password123", got.Password, "the plaintext must not be stored")
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(got.Password), []byte("password123")))
	assert.Error(t, bcrypt.CompareHashAndPassword([]byte(got.Password), []byte("wrong-password")))

	cost, err := bcrypt.Cost([]byte(got.Password))
	require.NoError(t, err)
	assert.Equal(t, user.UserBcryptCost, cost)
}

// The column is NOT NULL, and a nil pq.StringArray writes SQL NULL rather than
// an empty array, so the service has to substitute one.
func TestCreateUserDefaultsCertificationToEmpty(t *testing.T) {
	t.Parallel()

	svc := user.NewUserService(NewFakeUserRepository())

	got, err := svc.CreateUser(context.Background(), validParams())
	require.NoError(t, err)
	assert.NotNil(t, got.Certification)
	assert.Empty(t, got.Certification)

	params := validParams()
	params.Email = "grace@boutline.test"
	params.Certification = []string{"CPR", "First Aid"}

	withCerts, err := svc.CreateUser(context.Background(), params)
	require.NoError(t, err)
	assert.Equal(t, []string{"CPR", "First Aid"}, []string(withCerts.Certification))
}

func TestGetUserByEmail(t *testing.T) {
	t.Parallel()

	svc := user.NewUserService(NewFakeUserRepository())
	created, err := svc.CreateUser(context.Background(), validParams())
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
