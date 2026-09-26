package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/match"
	"boutline/internal/features/tournament"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, tournaments *FakeTournamentLookup, seed ...match.Match) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	match.RegisterMatchService(api, match.NewMatchService(NewFakeMatchRepository(seed...), tournaments))

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

	activeTournament := seededTournament(tournament.TournamentStatusActive)
	referee := uuid.New().String()
	competitor1 := uuid.New().String()
	competitor2 := uuid.New().String()

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name: "creates a match and echoes the stored row",
			body: map[string]any{
				"tournament_id":   activeTournament.ID.String(),
				"referee_id":      referee,
				"competitor_1_id": competitor1,
				"competitor_2_id": competitor2,
				"points_to_win":   11,
			},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"tournament_id":   activeTournament.ID.String(),
				"referee_id":      referee,
				"competitor_1_id": competitor1,
				"competitor_2_id": competitor2,
				"status":          "pending",
			},
		},
		{
			name: "rejects a missing competitor before the handler runs",
			body: map[string]any{
				"tournament_id":   activeTournament.ID.String(),
				"referee_id":      referee,
				"competitor_1_id": competitor1,
				"points_to_win":   11,
			},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "rejects a zero points_to_win before the handler runs",
			body: map[string]any{
				"tournament_id":   activeTournament.ID.String(),
				"referee_id":      referee,
				"competitor_1_id": competitor1,
				"competitor_2_id": competitor2,
				"points_to_win":   0,
			},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, NewFakeTournamentLookup(activeTournament)).Post("/api/v1/matches", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestListEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	seed := []match.Match{
		seededMatch(match.MatchStatusPending, tournamentID),
		seededMatch(match.MatchStatusActive, tournamentID),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).Get("/api/v1/matches?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("filters by tournament_id and status", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).
			Get("/api/v1/matches?tournament_id=" + tournamentID.String() + "&status=active")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.InDelta(t, 1, body["total"], 0)
	})

	t.Run("rejects a status outside the enum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).Get("/api/v1/matches?status=nope")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestGetAndUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededMatch(match.MatchStatusPending, uuid.New())

	t.Run("returns the stored match", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).Get("/api/v1/matches/" + stored.ID.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).Get("/api/v1/matches/" + uuid.New().String())

		assert.Equal(t, http.StatusNotFound, resp.Code)
	})

	t.Run("patches only the fields present in the body", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).
			Patch("/api/v1/matches/"+stored.ID.String(), map[string]any{"points_to_win": 21})

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.InDelta(t, 21, body["points_to_win"], 0)
	})
}

func TestLifecycleEndpoints(t *testing.T) {
	t.Parallel()

	activeTournament := seededTournament(tournament.TournamentStatusActive)
	stored := seededMatch(match.MatchStatusPending, activeTournament.ID)
	api := newTestAPI(t, NewFakeTournamentLookup(activeTournament), stored)
	base := "/api/v1/matches/" + stored.ID.String()

	started := api.Post(base + "/start")
	require.Equal(t, http.StatusOK, started.Code, "body: %s", started.Body)
	assert.Equal(t, "active", decodeBody(t, started.Body.Bytes())["status"])

	assert.Equal(t, http.StatusConflict, api.Post(base+"/start").Code)

	ended := api.Post(base + "/end")
	require.Equal(t, http.StatusOK, ended.Code, "body: %s", ended.Body)
	assert.Equal(t, "end", decodeBody(t, ended.Body.Bytes())["status"])

	assert.Equal(t, http.StatusConflict, api.Post(base+"/end").Code)
	assert.Equal(t, http.StatusConflict, api.Post(base+"/start").Code)
}

func TestDeleteEndpoint(t *testing.T) {
	t.Parallel()

	activeTournament := seededTournament(tournament.TournamentStatusActive)
	stored := seededMatch(match.MatchStatusPending, activeTournament.ID)
	api := newTestAPI(t, NewFakeTournamentLookup(activeTournament), stored)
	base := "/api/v1/matches/" + stored.ID.String()

	require.Equal(t, http.StatusOK, api.Post(base+"/start").Code)
	assert.Equal(t, http.StatusConflict, api.Delete(base).Code)

	require.Equal(t, http.StatusOK, api.Post(base+"/end").Code)
	deleted := api.Delete(base)
	require.Equal(t, http.StatusNoContent, deleted.Code, "body: %s", deleted.Body)
	assert.Empty(t, deleted.Body.String())

	assert.Equal(t, http.StatusNotFound, api.Get(base).Code)
	assert.Equal(t, http.StatusNotFound, api.Delete(base).Code)
}
