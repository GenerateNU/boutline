package test

import (
	"errors"
	"net/http"
	"strings"
	"testing"

	"boutline/internal/features/tournament"
	"boutline/internal/features/user"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func seeded(email, firstName, lastName string) user.User {
	return user.User{ID: uuid.New(), Email: email, FirstName: firstName, LastName: lastName}
}

// The service returns Huma errors now that Huma registers it directly, so a
// failure is asserted by the status and detail a client would receive.
func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func createInput(email, firstName, lastName string) *user.UserCreateInput {
	return &user.UserCreateInput{
		Body: user.UserCreateBody{Email: email, Password: "hunter2", FirstName: firstName, LastName: lastName},
	}
}

func TestCreateUser(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		seed          []user.User
		input         *user.UserCreateInput
		wantEmail     string
		wantFirstName string
		wantCode      int
		wantDetail    string
	}{
		{
			name:          "trims the name fields",
			input:         createInput("new@example.com", "  Ada  ", "  Lovelace  "),
			wantEmail:     "new@example.com",
			wantFirstName: "Ada",
		},
		{
			name:       "rejects a first name that is only whitespace",
			input:      createInput("new@example.com", "   ", "Lovelace"),
			wantCode:   http.StatusBadRequest,
			wantDetail: "first name must not be blank",
		},
		{
			name:       "rejects a last name that is only whitespace",
			input:      createInput("new@example.com", "Ada", "   "),
			wantCode:   http.StatusBadRequest,
			wantDetail: "last name must not be blank",
		},
		{
			// Huma's format:"email" rejects this over HTTP; the check still has
			// to exist for a caller that does not come through a request.
			name:       "rejects a malformed email",
			input:      createInput("not-an-email", "Ada", "Lovelace"),
			wantCode:   http.StatusBadRequest,
			wantDetail: "email must be a valid address",
		},
		{
			name:       "reports a duplicate email",
			seed:       []user.User{seeded("taken@example.com", "Grace", "Hopper")},
			input:      createInput("taken@example.com", "Ada", "Lovelace"),
			wantCode:   http.StatusConflict,
			wantDetail: `a user with email "taken@example.com" already exists`,
		},
		{
			// Huma's maxLength:"72" rejects this over HTTP; the check still has
			// to exist for a caller that does not come through a request.
			name: "rejects a password over bcrypt's 72 byte limit",
			input: &user.UserCreateInput{
				Body: user.UserCreateBody{
					Email: "new@example.com", Password: strings.Repeat("a", 73),
					FirstName: "Ada", LastName: "Lovelace",
				},
			},
			wantCode:   http.StatusBadRequest,
			wantDetail: "password must be at most 72 bytes",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeUserRepository(tt.seed...)
			out, err := user.NewUserService(repo, NewFakeTournamentMembership()).CreateUser(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				assert.Len(t, repo.Users, len(tt.seed))
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantEmail, out.Body.Email)
			assert.Equal(t, tt.wantFirstName, out.Body.FirstName)
			assert.NotEmpty(t, out.Body.ID)
			assert.Len(t, repo.Users, len(tt.seed)+1)

			id, err := uuid.Parse(out.Body.ID)
			require.NoError(t, err)
			stored := repo.Users[id]
			assert.NotEqual(t, tt.input.Body.Password, stored.Password)
			assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(stored.Password), []byte(tt.input.Body.Password)))
		})
	}
}

func TestGetUserByID(t *testing.T) {
	t.Parallel()

	stored := seeded("stored@example.com", "Stored", "User")
	service := user.NewUserService(NewFakeUserRepository(stored), NewFakeTournamentMembership())

	t.Run("returns the stored user", func(t *testing.T) {
		t.Parallel()

		out, err := service.GetUserByID(t.Context(), &user.UserIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Equal(t, stored.ID.String(), out.Body.ID)
		assert.Equal(t, stored.Email, out.Body.Email)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := service.GetUserByID(t.Context(), &user.UserIDInput{ID: uuid.New().String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
		assert.Equal(t, "not found", detail)
	})

	t.Run("rejects an id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		// Huma's format:"uuid" catches this first over HTTP, with a 422.
		_, err := service.GetUserByID(t.Context(), &user.UserIDInput{ID: "not-a-uuid"})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
}

func TestListUsers(t *testing.T) {
	t.Parallel()

	seed := []user.User{
		seeded("a@example.com", "A", "Person"),
		seeded("b@example.com", "B", "Person"),
		seeded("c@example.com", "C", "Person"),
	}

	tests := []struct {
		name       string
		input      *user.UserListInput
		wantEmails []string
		wantTotal  int64
		wantLimit  int
		wantOffset int
	}{
		{
			name:       "defaults to the first page",
			input:      &user.UserListInput{},
			wantEmails: []string{"a@example.com", "b@example.com", "c@example.com"},
			wantTotal:  3,
			wantLimit:  user.UserDefaultPageSize,
		},
		{
			name:       "applies limit and offset",
			input:      &user.UserListInput{Limit: 2, Offset: 1},
			wantEmails: []string{"b@example.com", "c@example.com"},
			wantTotal:  3,
			wantLimit:  2,
			wantOffset: 1,
		},
		{
			name:       "clamps a limit above the maximum",
			input:      &user.UserListInput{Limit: user.UserMaxPageSize + 50},
			wantEmails: []string{"a@example.com", "b@example.com", "c@example.com"},
			wantTotal:  3,
			wantLimit:  user.UserMaxPageSize,
		},
		{
			name:       "treats a negative offset as the first page",
			input:      &user.UserListInput{Offset: -5},
			wantEmails: []string{"a@example.com", "b@example.com", "c@example.com"},
			wantTotal:  3,
			wantLimit:  user.UserDefaultPageSize,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := user.NewUserService(NewFakeUserRepository(seed...), NewFakeTournamentMembership()).ListUsers(t.Context(), tt.input)

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
			assert.Equal(t, tt.wantOffset, out.Body.Offset)

			emails := make([]string, 0, len(out.Body.Data))
			for _, listed := range out.Body.Data {
				emails = append(emails, listed.Email)
			}
			assert.Equal(t, tt.wantEmails, emails)
		})
	}
}

func updateInput(id string, firstName, lastName *string) *user.UserUpdateInput {
	return &user.UserUpdateInput{
		ID:   id,
		Body: user.UserUpdateBody{FirstName: firstName, LastName: lastName},
	}
}

func ptr[T any](v T) *T { return &v }

func TestUpdateUserByID(t *testing.T) {
	t.Parallel()

	stored := seeded("before@example.com", "Before", "Name")

	tests := []struct {
		name          string
		seed          []user.User
		input         *user.UserUpdateInput
		wantEmail     string
		wantFirstName string
		wantCode      int
		wantDetail    string
	}{
		{
			name:          "renames without touching the email",
			seed:          []user.User{stored},
			input:         updateInput(stored.ID.String(), ptr("After"), nil),
			wantEmail:     "before@example.com",
			wantFirstName: "After",
		},
		{
			name:       "refuses a patch that would change nothing",
			seed:       []user.User{stored},
			input:      updateInput(stored.ID.String(), nil, nil),
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide at least one field to update",
		},
		{
			name:       "rejects a first name that is only whitespace",
			seed:       []user.User{stored},
			input:      updateInput(stored.ID.String(), ptr("   "), nil),
			wantCode:   http.StatusBadRequest,
			wantDetail: "first name must not be blank",
		},
		{
			name:     "reports an unknown id as not found",
			input:    updateInput(uuid.New().String(), ptr("After"), nil),
			wantCode: http.StatusNotFound,
		},
		{
			name:     "rejects an id that is not a uuid",
			seed:     []user.User{stored},
			input:    updateInput("not-a-uuid", ptr("After"), nil),
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeUserRepository(tt.seed...)
			out, err := user.NewUserService(repo, NewFakeTournamentMembership()).UpdateUserByID(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantEmail, out.Body.Email)
			assert.Equal(t, tt.wantFirstName, out.Body.FirstName)

			// The response is a read of what is stored, not an echo of the patch.
			assert.Equal(t, tt.wantEmail, repo.Users[stored.ID].Email)
			assert.Equal(t, tt.wantFirstName, repo.Users[stored.ID].FirstName)
		})
	}
}

func TestDeleteUser(t *testing.T) {
	t.Parallel()

	t.Run("removes the stored user", func(t *testing.T) {
		t.Parallel()

		stored := seeded("doomed@example.com", "Doomed", "User")
		repo := NewFakeUserRepository(stored)

		_, err := user.NewUserService(repo, NewFakeTournamentMembership()).DeleteUser(t.Context(), &user.UserIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Empty(t, repo.Users)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := user.NewUserService(NewFakeUserRepository(), NewFakeTournamentMembership()).
			DeleteUser(t.Context(), &user.UserIDInput{ID: uuid.New().String()})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

// A repository failure is nobody's fault but ours, so it becomes a 500 with a
// generic message rather than leaking the driver error.
func TestRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeUserRepository()
	repo.Err = errors.New("connection refused")

	_, err := user.NewUserService(repo, NewFakeTournamentMembership()).ListUsers(t.Context(), &user.UserListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}

func TestListTournamentsByUser(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	joined := tournament.Tournament{ID: uuid.New(), Name: "a joined", Status: tournament.TournamentStatusPending}
	alsoJoined := tournament.Tournament{ID: uuid.New(), Name: "b joined", Status: tournament.TournamentStatusActive}

	newService := func() user.UserService {
		memberships := NewFakeTournamentMembership()
		memberships.ByUser[userID] = []tournament.Tournament{joined, alsoJoined}

		return user.NewUserService(NewFakeUserRepository(), memberships)
	}

	t.Run("returns only the tournaments the user belongs to", func(t *testing.T) {
		t.Parallel()

		out, err := newService().ListTournamentsByUser(t.Context(),
			&user.UserTournamentsInput{ID: userID.String()})

		require.NoError(t, err)
		require.Len(t, out.Body.Data, 2)
		assert.Equal(t, int64(2), out.Body.Total)
		assert.Equal(t, "a joined", out.Body.Data[0].Name)
		assert.Equal(t, "b joined", out.Body.Data[1].Name)
	})

	t.Run("returns nothing for a user with no memberships", func(t *testing.T) {
		t.Parallel()

		out, err := newService().ListTournamentsByUser(t.Context(),
			&user.UserTournamentsInput{ID: uuid.New().String()})

		require.NoError(t, err)
		assert.Empty(t, out.Body.Data)
		assert.Equal(t, int64(0), out.Body.Total)
	})

	t.Run("pages the result", func(t *testing.T) {
		t.Parallel()

		out, err := newService().ListTournamentsByUser(t.Context(),
			&user.UserTournamentsInput{ID: userID.String(), Limit: 1, Offset: 1})

		require.NoError(t, err)
		require.Len(t, out.Body.Data, 1)
		assert.Equal(t, "b joined", out.Body.Data[0].Name)
		assert.Equal(t, int64(2), out.Body.Total)
	})

	t.Run("rejects a user id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		_, err := newService().ListTournamentsByUser(t.Context(),
			&user.UserTournamentsInput{ID: "not-a-uuid"})

		status, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, status)
		assert.Equal(t, "id must be a valid uuid", detail)
	})
}
