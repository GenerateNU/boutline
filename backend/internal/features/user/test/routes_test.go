package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/tournament"
	"boutline/internal/features/user"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// The registered operations are exercised over a fake repository: the schema
// validation Huma derives from the struct tags only runs on a real request, so
// these are the cases a direct call to the service cannot reach. No database is
// involved.
func newTestAPI(t *testing.T, seed ...user.User) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	user.RegisterUserService(api, user.NewUserService(NewFakeUserRepository(seed...), newTestTokens()))

	return api
}

func decodeBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func TestSignupEndpoint(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		seed       []user.User
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name: "creates a user and returns a token with the stored row",
			body: map[string]any{
				"email": "new@example.com", "password": "hunter2", "firstName": "  Ada  ", "lastName": "Lovelace",
			},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"email": "new@example.com", "firstName": "Ada"},
		},
		{
			name:       "rejects a malformed email before the handler runs",
			body:       map[string]any{"email": "nope", "password": "hunter2", "firstName": "Ada", "lastName": "Lovelace"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a blank first name",
			body:       map[string]any{"email": "new@example.com", "password": "hunter2", "firstName": "", "lastName": "Lovelace"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a missing password",
			body:       map[string]any{"email": "new@example.com", "firstName": "Ada", "lastName": "Lovelace"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			// The client can act on this one, so it gets a real message rather
			// than the wrapped chain the service built on the way up.
			name: "reports a duplicate email as a conflict the client can read",
			seed: []user.User{seeded("taken@example.com", "Grace", "Hopper")},
			body: map[string]any{
				"email": "taken@example.com", "password": "hunter2", "firstName": "Ada", "lastName": "Lovelace",
			},
			wantStatus: http.StatusConflict,
			wantFields: map[string]any{"detail": `a user with email "taken@example.com" already exists`},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, tt.seed...).Post("/api/v1/auth/signup", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			if resp.Code == http.StatusCreated {
				assert.NotEmpty(t, body["token"])
				body, _ = body["user"].(map[string]any)
			}
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
			assert.NotContains(t, body, "password")
		})
	}
}

func TestLoginEndpoint(t *testing.T) {
	t.Parallel()

	hash, err := bcrypt.GenerateFromPassword([]byte("hunter2"), bcrypt.MinCost)
	require.NoError(t, err)
	stored := seeded("ada@example.com", "Ada", "Lovelace")
	stored.Password = string(hash)

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{
			name:       "issues a token for the right password",
			body:       map[string]any{"email": "ada@example.com", "password": "hunter2"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "rejects a missing password before the handler runs",
			body:       map[string]any{"email": "ada@example.com"},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Post("/api/v1/auth/login", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}

	// A client must not be able to tell an unknown email from a wrong password.
	t.Run("unknown email and wrong password give identical responses", func(t *testing.T) {
		t.Parallel()

		api := newTestAPI(t, stored)
		wrongPassword := api.Post("/api/v1/auth/login", map[string]any{"email": "ada@example.com", "password": "nope"})
		unknownEmail := api.Post("/api/v1/auth/login", map[string]any{"email": "nobody@example.com", "password": "nope"})

		assert.Equal(t, http.StatusUnauthorized, wrongPassword.Code)
		assert.Equal(t, wrongPassword.Code, unknownEmail.Code)
		assert.Equal(t, wrongPassword.Body.String(), unknownEmail.Body.String())
		assert.Equal(t, "email or password is incorrect", decodeBody(t, wrongPassword.Body.Bytes())["detail"])
	})
}

func TestGetByIDEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("stored@example.com", "Stored", "User")

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "returns the stored user", path: stored.ID.String(), wantStatus: http.StatusOK},
		{name: "reports an unknown id as not found", path: uuid.New().String(), wantStatus: http.StatusNotFound},
		{name: "rejects an id that is not a uuid", path: "not-a-uuid", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Get("/api/v1/users/" + tt.path)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestListEndpoint(t *testing.T) {
	t.Parallel()

	seed := []user.User{
		seeded("a@example.com", "A", "Person"),
		seeded("b@example.com", "B", "Person"),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/users?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("rejects a limit above the maximum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/users?limit=500")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("matches by name when a query is given", func(t *testing.T) {
		t.Parallel()

		mixed := []user.User{
			seeded("ada@example.com", "Ada", "Lovelace"),
			seeded("grace@example.com", "Grace", "Hopper"),
		}
		resp := newTestAPI(t, mixed...).Get("/api/v1/users?q=lovelace")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		require.Len(t, body["data"], 1)
		assert.InDelta(t, 1, body["total"], 0)
	})
}

func TestDeleteEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("doomed@example.com", "Doomed", "User")

	t.Run("deletes once and then reports not found", func(t *testing.T) {
		t.Parallel()

		api := newTestAPI(t, stored)
		path := "/api/v1/users/" + stored.ID.String()

		require.Equal(t, http.StatusNoContent, api.Delete(path).Code)
		assert.Equal(t, http.StatusNotFound, api.Get(path).Code)
		assert.Equal(t, http.StatusNotFound, api.Delete(path).Code)
	})

	tests := []struct {
		name       string
		path       string
		referenced bool
		wantStatus int
		wantDetail string
	}{
		{name: "reports an unknown id as not found", path: uuid.New().String(), wantStatus: http.StatusNotFound},
		{name: "rejects an id that is not a uuid", path: "not-a-uuid", wantStatus: http.StatusUnprocessableEntity},
		{
			name:       "refuses a user a tournament or bout still points at",
			path:       stored.ID.String(),
			referenced: true,
			wantStatus: http.StatusConflict,
			wantDetail: "a user who created a tournament or referees a bout cannot be deleted",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeUserRepository(stored)
			repo.Referenced = map[uuid.UUID]bool{stored.ID: tt.referenced}
			_, api := humatest.New(t)
			user.RegisterUserService(api, user.NewUserService(repo, newTestTokens()))

			resp := api.Delete("/api/v1/users/" + tt.path)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
			if tt.wantDetail != "" {
				assert.Equal(t, tt.wantDetail, decodeBody(t, resp.Body.Bytes())["detail"])
			}
			assert.Contains(t, repo.Users, stored.ID, "a refused delete must leave the user in place")
		})
	}
}

func TestUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("before@example.com", "Before", "Name")

	tests := []struct {
		name       string
		path       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "patches only the fields present in the body",
			path:       stored.ID.String(),
			body:       map[string]any{"firstName": "After"},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"firstName": "After", "email": "before@example.com"},
		},
		{
			name:       "rejects an empty patch",
			path:       stored.ID.String(),
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
			wantFields: map[string]any{"detail": "provide at least one field to update"},
		},
		{
			name:       "reports an unknown id as not found",
			path:       uuid.New().String(),
			body:       map[string]any{"firstName": "After"},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Patch("/api/v1/users/"+tt.path, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestListTournamentsByUserEndpoint(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	joined := tournament.Tournament{ID: uuid.New(), Name: "joined", Status: tournament.TournamentStatusPending}

	repo := NewFakeUserRepository()
	repo.Joined[userID] = []tournament.Tournament{joined}

	_, api := humatest.New(t)
	user.RegisterUserService(api, user.NewUserService(repo, newTestTokens()))

	resp := api.Get("/api/v1/users/" + userID.String() + "/tournaments")
	require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

	body := decodeBody(t, resp.Body.Bytes())
	require.Len(t, body["data"], 1)
	assert.InDelta(t, 1, body["total"], 0)

	listed, ok := body["data"].([]any)[0].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "joined", listed["name"])

	assert.Equal(t, http.StatusUnprocessableEntity, api.Get("/api/v1/users/not-a-uuid/tournaments").Code)
}
