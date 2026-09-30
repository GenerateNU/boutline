package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/user"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The registered operations are exercised over a fake repository: the schema
// validation Huma derives from the struct tags only runs on a real request, so
// these are the cases a direct call to the service cannot reach. No database is
// involved.
func newTestAPI(t *testing.T, seed ...user.User) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	user.RegisterUserService(api, user.NewUserService(NewFakeUserRepository(seed...)))

	return api
}

func decodeBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func TestCreateEndpoint(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		seed       []user.User
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name: "creates a user and echoes the stored row",
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

			resp := newTestAPI(t, tt.seed...).Post("/api/v1/users", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
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
