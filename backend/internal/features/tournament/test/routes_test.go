package test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"boutline/internal/features/tournament"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, seed ...tournament.Tournament) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	tournament.RegisterTournamentService(api,
		tournament.NewTournamentService(NewFakeTournamentRepository(seed...)))

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

	creator := uuid.New().String()

	tests := []struct {
		name              string
		body              map[string]any
		wantStatus        int
		wantFields        map[string]any
		wantGeneratedCode bool
	}{
		{
			name:       "creates a tournament and echoes the stored row",
			body:       map[string]any{"name": "  from http  ", "created_by": creator},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"name":         "from http",
				"visibility":   "private",
				"status":       "pending",
				"created_by":   creator,
				"completed_at": nil,
			},
			wantGeneratedCode: true,
		},
		{
			name:       "rejects a blank name before the handler runs",
			body:       map[string]any{"name": "", "created_by": creator},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a missing created_by",
			body:       map[string]any{"name": "fine"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a created_by that is not a uuid",
			body:       map[string]any{"name": "fine", "created_by": "not-a-uuid"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a visibility outside the enum",
			body:       map[string]any{"name": "fine", "visibility": "nope", "created_by": creator},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "refuses a client-supplied code",
			body:       map[string]any{"name": "fine", "created_by": creator, "code": "CHOSEN"},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t).Post("/api/v1/tournaments", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}

			if tt.wantGeneratedCode {
				code, ok := body["code"].(string)
				require.True(t, ok, "code missing from response")
				assert.Len(t, code, tournament.TournamentCodeLength)
				assert.Equal(t, strings.ToUpper(code), code)
			}
		})
	}
}

func TestGetByIDEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", tournament.TournamentStatusPending)

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "returns the stored tournament", path: stored.ID.String(), wantStatus: http.StatusOK},
		{name: "reports an unknown id as not found", path: uuid.New().String(), wantStatus: http.StatusNotFound},
		{name: "rejects an id that is not a uuid", path: "not-a-uuid", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Get("/api/v1/tournaments/" + tt.path)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestGetByCodeEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", tournament.TournamentStatusPending)

	tests := []struct {
		name       string
		code       string
		wantStatus int
	}{
		{name: "finds the tournament from a lowercase code", code: strings.ToLower(stored.Code), wantStatus: http.StatusOK},
		{name: "finds the tournament from the stored code", code: stored.Code, wantStatus: http.StatusOK},
		{name: "reports an unknown code as not found", code: "ZZZZZZ", wantStatus: http.StatusNotFound},
		{name: "rejects a code shorter than six characters", code: "ABC", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Get("/api/v1/tournaments/code/" + tt.code)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestListEndpoint(t *testing.T) {
	t.Parallel()

	seed := []tournament.Tournament{
		seeded("a pending", tournament.TournamentStatusPending),
		seeded("b active", tournament.TournamentStatusActive),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("rejects a limit above the maximum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments?limit=500")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("rejects a status outside the enum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments?status=nope")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("before", tournament.TournamentStatusPending)

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
			body:       map[string]any{"visibility": "public"},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"name": "before", "visibility": "public"},
		},
		{
			name:       "rejects a visibility outside the enum before the service runs",
			path:       stored.ID.String(),
			body:       map[string]any{"visibility": "nope"},
			wantStatus: http.StatusUnprocessableEntity,
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
			body:       map[string]any{"name": "after"},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Patch("/api/v1/tournaments/"+tt.path, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestLifecycleEndpoints(t *testing.T) {
	t.Parallel()

	stored := seeded("bracket", tournament.TournamentStatusPending)
	api := newTestAPI(t, stored)
	base := "/api/v1/tournaments/" + stored.ID.String()

	started := api.Post(base + "/start")
	require.Equal(t, http.StatusOK, started.Code, "body: %s", started.Body)
	assert.Equal(t, "active", decodeBody(t, started.Body.Bytes())["status"])

	assert.Equal(t, http.StatusConflict, api.Post(base+"/start").Code)

	completed := api.Post(base + "/complete")
	require.Equal(t, http.StatusOK, completed.Code, "body: %s", completed.Body)

	completedBody := decodeBody(t, completed.Body.Bytes())
	assert.Equal(t, "end", completedBody["status"])
	assert.NotNil(t, completedBody["completed_at"])

	assert.Equal(t, http.StatusConflict, api.Post(base+"/complete").Code)
	assert.Equal(t, http.StatusConflict, api.Post(base+"/start").Code)

	edit := api.Patch(base, map[string]any{"name": "too late"})
	require.Equal(t, http.StatusConflict, edit.Code, "body: %s", edit.Body)
	assert.Equal(t, "tournament has ended and can no longer be edited",
		decodeBody(t, edit.Body.Bytes())["detail"])
}
