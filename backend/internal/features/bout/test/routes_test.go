package test

import (
	"context"
	"encoding/json"
	"maps"
	"net/http"
	"slices"
	"testing"

	"boutline/internal/features/bout"
	"boutline/internal/features/tournament"
	"boutline/internal/session"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, tournaments *FakeTournamentLookup, seed ...bout.Bout) humatest.TestAPI {
	t.Helper()

	tournamentIDs := slices.Collect(maps.Keys(tournaments.Tournaments))
	for _, seeded := range seed {
		tournamentIDs = append(tournamentIDs, seeded.TournamentID)
	}

	_, api := humatest.New(t)
	bout.RegisterBoutService(api, bout.NewBoutService(
		NewFakeBoutRepository(seed...), tournaments, NewFakePoolLookup(nil), staffOf(tournamentIDs...)))

	return api
}

func asUser(t *testing.T, id uuid.UUID) context.Context {
	t.Helper()

	return session.WithUserID(t.Context(), id)
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
			name: "creates a bout and echoes the stored row",
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
				"status":          "upcoming",
			},
		},
		{
			name: "creates a bout with no referee assigned yet",
			body: map[string]any{
				"tournament_id":   activeTournament.ID.String(),
				"competitor_1_id": competitor1,
				"competitor_2_id": competitor2,
				"points_to_win":   11,
			},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"referee_id": nil,
				"started_at": nil,
				"status":     "upcoming",
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

			resp := newTestAPI(t, NewFakeTournamentLookup(activeTournament)).
				PostCtx(asUser(t, TestAdminID), "/api/v1/bouts", tt.body)

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
	seed := []bout.Bout{
		seededBout(bout.BoutStatusUpcoming, tournamentID),
		seededBout(bout.BoutStatusActive, tournamentID),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).Get("/api/v1/bouts?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("filters by tournament_id and status", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).
			Get("/api/v1/bouts?tournament_id=" + tournamentID.String() + "&status=active")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.InDelta(t, 1, body["total"], 0)
	})

	t.Run("rejects a status outside the enum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).Get("/api/v1/bouts?status=nope")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("filters by ids", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).
			Get("/api/v1/bouts?ids=" + seed[0].ID.String() + "," + seed[1].ID.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 2)
		assert.InDelta(t, 2, body["total"], 0)
	})

	t.Run("rejects a malformed ids filter", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).Get("/api/v1/bouts?ids=not-a-uuid")

		assert.Equal(t, http.StatusBadRequest, resp.Code)
	})
}

func TestGetAndUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededBout(bout.BoutStatusUpcoming, uuid.New())

	t.Run("returns the stored bout", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).Get("/api/v1/bouts/" + stored.ID.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).Get("/api/v1/bouts/" + uuid.New().String())

		assert.Equal(t, http.StatusNotFound, resp.Code)
	})

	t.Run("patches only the fields present in the body", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).
			PatchCtx(asUser(t, TestAdminID), "/api/v1/bouts/"+stored.ID.String(), map[string]any{"points_to_win": 21})

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.InDelta(t, 21, body["points_to_win"], 0)
	})

	t.Run("refuses to move a bout to another pool", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).
			PatchCtx(asUser(t, TestAdminID), "/api/v1/bouts/"+stored.ID.String(), map[string]any{"pool_id": uuid.New().String()})

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code, "body: %s", resp.Body)
	})
}

func TestLifecycleEndpoints(t *testing.T) {
	t.Parallel()

	activeTournament := seededTournament(tournament.TournamentStatusActive)
	stored := seededBout(bout.BoutStatusUpcoming, activeTournament.ID)
	api := newTestAPI(t, NewFakeTournamentLookup(activeTournament), stored)
	base := "/api/v1/bouts/" + stored.ID.String()

	referee := asUser(t, TestRefereeID)
	started := api.PostCtx(referee, base+"/start")
	require.Equal(t, http.StatusOK, started.Code, "body: %s", started.Body)
	assert.Equal(t, "active", decodeBody(t, started.Body.Bytes())["status"])

	assert.Equal(t, http.StatusConflict, api.PostCtx(referee, base+"/start").Code)

	ended := api.PostCtx(referee, base+"/end")
	require.Equal(t, http.StatusOK, ended.Code, "body: %s", ended.Body)
	assert.Equal(t, "ended", decodeBody(t, ended.Body.Bytes())["status"])

	assert.Equal(t, http.StatusConflict, api.PostCtx(referee, base+"/end").Code)
	assert.Equal(t, http.StatusConflict, api.PostCtx(referee, base+"/start").Code)
}

func TestDeleteEndpoint(t *testing.T) {
	t.Parallel()

	activeTournament := seededTournament(tournament.TournamentStatusActive)
	stored := seededBout(bout.BoutStatusUpcoming, activeTournament.ID)
	api := newTestAPI(t, NewFakeTournamentLookup(activeTournament), stored)
	base := "/api/v1/bouts/" + stored.ID.String()
	admin := asUser(t, TestAdminID)
	referee := asUser(t, TestRefereeID)

	require.Equal(t, http.StatusOK, api.PostCtx(referee, base+"/start").Code)
	assert.Equal(t, http.StatusConflict, api.DeleteCtx(admin, base).Code)

	require.Equal(t, http.StatusOK, api.PostCtx(referee, base+"/end").Code)
	deleted := api.DeleteCtx(admin, base)
	require.Equal(t, http.StatusNoContent, deleted.Code, "body: %s", deleted.Body)
	assert.Empty(t, deleted.Body.String())

	assert.Equal(t, http.StatusNotFound, api.Get(base).Code)
	assert.Equal(t, http.StatusNotFound, api.DeleteCtx(admin, base).Code)
}

func TestForbiddenCallersEndpoints(t *testing.T) {
	t.Parallel()

	activeTournament := seededTournament(tournament.TournamentStatusActive)
	upcoming := seededBout(bout.BoutStatusUpcoming, activeTournament.ID)
	active := seededBout(bout.BoutStatusActive, activeTournament.ID)
	base := "/api/v1/bouts/"

	tests := []struct {
		name   string
		caller *uuid.UUID // nil means no caller
		call   func(api humatest.TestAPI, ctx context.Context) int
	}{
		{"create without a caller", nil, func(api humatest.TestAPI, ctx context.Context) int {
			return api.PostCtx(ctx, "/api/v1/bouts", map[string]any{
				"tournament_id": activeTournament.ID.String(), "competitor_1_id": uuid.NewString(),
				"competitor_2_id": uuid.NewString(), "points_to_win": 11,
			}).Code
		}},
		{"create by a referee", ptr(TestRefereeID), func(api humatest.TestAPI, ctx context.Context) int {
			return api.PostCtx(ctx, "/api/v1/bouts", map[string]any{
				"tournament_id": activeTournament.ID.String(), "competitor_1_id": uuid.NewString(),
				"competitor_2_id": uuid.NewString(), "points_to_win": 11,
			}).Code
		}},
		{"update by a referee", ptr(TestRefereeID), func(api humatest.TestAPI, ctx context.Context) int {
			return api.PatchCtx(ctx, base+upcoming.ID.String(), map[string]any{"points_to_win": 21}).Code
		}},
		{"update by a non-member", ptr(uuid.New()), func(api humatest.TestAPI, ctx context.Context) int {
			return api.PatchCtx(ctx, base+upcoming.ID.String(), map[string]any{"points_to_win": 21}).Code
		}},
		{"delete by a referee", ptr(TestRefereeID), func(api humatest.TestAPI, ctx context.Context) int {
			return api.DeleteCtx(ctx, base+upcoming.ID.String()).Code
		}},
		{"start without a caller", nil, func(api humatest.TestAPI, ctx context.Context) int {
			return api.PostCtx(ctx, base+upcoming.ID.String()+"/start").Code
		}},
		{"start by a non-member", ptr(uuid.New()), func(api humatest.TestAPI, ctx context.Context) int {
			return api.PostCtx(ctx, base+upcoming.ID.String()+"/start").Code
		}},
		{"end by a non-member", ptr(uuid.New()), func(api humatest.TestAPI, ctx context.Context) int {
			return api.PostCtx(ctx, base+active.ID.String()+"/end").Code
		}},
		{"start by an admin who is not the bout's referee", ptr(TestAdminID), func(api humatest.TestAPI, ctx context.Context) int {
			return api.PostCtx(ctx, base+upcoming.ID.String()+"/start").Code
		}},
		{"end by a referee who is not the bout's referee", ptr(TestOtherRefereeID), func(api humatest.TestAPI, ctx context.Context) int {
			return api.PostCtx(ctx, base+active.ID.String()+"/end").Code
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newTestAPI(t, NewFakeTournamentLookup(activeTournament), upcoming, active)

			ctx := t.Context()
			if tt.caller != nil {
				ctx = asUser(t, *tt.caller)
			}

			assert.Equal(t, http.StatusForbidden, tt.call(api, ctx))

			list := decodeBody(t, api.Get("/api/v1/bouts").Body.Bytes())
			assert.InDelta(t, 2, list["total"], 0)
			unchanged := decodeBody(t, api.Get(base+upcoming.ID.String()).Body.Bytes())
			assert.Equal(t, "upcoming", unchanged["status"])
			assert.InDelta(t, upcoming.PointsToWin, unchanged["points_to_win"], 0)
		})
	}
}
