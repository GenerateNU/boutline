package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, seed ...tournamentuser.TournamentUser) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	tournamentuser.RegisterTournamentUserService(api,
		tournamentuser.NewTournamentUserService(NewFakeTournamentUserRepository(seed...)))

	return api
}

func decodeBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func TestAddTournamentUserEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	member := uuid.New()

	tests := []struct {
		name       string
		path       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "adds a referee",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "referee"},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"role": "referee", "tournament_id": tournamentID.String()},
		},
		{
			name:       "adds an admin",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "admin"},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"role": "admin"},
		},
		{
			name:       "rejects a role outside the enum before the service runs",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "scorekeeper"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a user_id that is not a uuid",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": "not-a-uuid", "role": "referee"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a tournament id that is not a uuid",
			path:       "not-a-uuid",
			body:       map[string]any{"user_id": uuid.New().String(), "role": "referee"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "reports an already-added user as a conflict",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": member.String(), "role": "admin"},
			wantStatus: http.StatusConflict,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newTestAPI(t, seededMembership(tournamentID, member, tournamentuser.TournamentUserRoleReferee))
			resp := api.Post("/api/v1/tournaments/"+tt.path+"/users", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestListTournamentUsersEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	seed := []tournamentuser.TournamentUser{
		seededMembership(tournamentID, uuid.New(), tournamentuser.TournamentUserRoleReferee),
		seededMembership(tournamentID, uuid.New(), tournamentuser.TournamentUserRoleAdmin),
		seededMembership(uuid.New(), uuid.New(), tournamentuser.TournamentUserRoleAdmin),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments/" + tournamentID.String() + "/users?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("rejects a limit above the maximum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments/" + tournamentID.String() + "/users?limit=500")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestUpdateTournamentUserRoleEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	member := uuid.New()

	tests := []struct {
		name       string
		userPath   string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "promotes a referee to admin",
			userPath:   member.String(),
			body:       map[string]any{"role": "admin"},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"role": "admin", "user_id": member.String()},
		},
		{
			name:       "rejects a role outside the enum",
			userPath:   member.String(),
			body:       map[string]any{"role": "nope"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "reports a non-member as not found",
			userPath:   uuid.New().String(),
			body:       map[string]any{"role": "admin"},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newTestAPI(t, seededMembership(tournamentID, member, tournamentuser.TournamentUserRoleReferee))
			resp := api.Patch("/api/v1/tournaments/"+tournamentID.String()+"/users/"+tt.userPath, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestRemoveTournamentUserEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	member := uuid.New()
	api := newTestAPI(t, seededMembership(tournamentID, member, tournamentuser.TournamentUserRoleReferee))
	path := "/api/v1/tournaments/" + tournamentID.String() + "/users/" + member.String()

	removed := api.Delete(path)
	require.Equal(t, http.StatusNoContent, removed.Code, "body: %s", removed.Body)
	assert.Empty(t, removed.Body.Bytes())

	assert.Equal(t, http.StatusNotFound, api.Delete(path).Code)
}

func TestListTournamentsByUserEndpoint(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	joined := tournament.Tournament{ID: uuid.New(), Name: "joined", Status: tournament.TournamentStatusPending}

	_, api := humatest.New(t)
	repo := NewFakeTournamentUserRepository(
		seededMembership(joined.ID, userID, tournamentuser.TournamentUserRoleAdmin),
		seededMembership(uuid.New(), uuid.New(), tournamentuser.TournamentUserRoleReferee),
	)
	repo.Tournaments[joined.ID] = joined
	tournamentuser.RegisterTournamentUserService(api, tournamentuser.NewTournamentUserService(repo))

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
