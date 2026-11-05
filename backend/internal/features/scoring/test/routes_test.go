package test

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"testing"
	"time"

	"boutline/internal/features/bout"
	"boutline/internal/features/scoring"
	"boutline/internal/features/user"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, bouts []bout.Bout, seed ...scoring.Scoring) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	scoring.RegisterScoringService(api,
		scoring.NewScoringService(NewFakeScoringRepository(seed...), NewFakeBoutLookup(bouts...)))

	return api
}

func asUser(id uuid.UUID) context.Context {
	return user.WithUserID(context.Background(), id)
}

func decodeBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func seeded(id int64, BoutID uuid.UUID) scoring.Scoring {
	now := time.Now()

	return scoring.Scoring{
		ID:           id,
		CreatedBy:    uuid.New(),
		Points:       1,
		CompetitorID: uuid.New(),
		BoutID:       BoutID,
		CreatedAt:    now.Add(time.Duration(id) * time.Second),
		UpdatedAt:    now,
	}
}

func seededRevoked(id int64, BoutID uuid.UUID) scoring.Scoring {
	s := seeded(id, BoutID)
	revokedAt := time.Now()
	revokedBy := uuid.New()
	s.RevokedAt = &revokedAt
	s.RevokedBy = &revokedBy

	return s
}

func TestCreateEndpoint(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	stranger := uuid.New()
	competitor := uuid.New().String()
	refereed := bout.Bout{ID: uuid.New(), RefereeID: &referee}
	unassigned := bout.Bout{ID: uuid.New()}
	match := refereed.ID.String()

	tests := []struct {
		name       string
		caller     *uuid.UUID
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "creates a score as the signed-in referee and echoes the stored row",
			caller:     &referee,
			body:       map[string]any{"competitor_id": competitor, "bout_id": match, "points": 2},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"created_by":    referee.String(),
				"competitor_id": competitor,
				"bout_id":       match,
				"points":        float64(2),
				"revoked_at":    nil,
				"revoked_by":    nil,
			},
		},
		{
			name:       "defaults points to 1 when omitted",
			caller:     &referee,
			body:       map[string]any{"competitor_id": competitor, "bout_id": match},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"points": float64(1)},
		},
		{
			name:       "refuses a different signed-in user",
			caller:     &stranger,
			body:       map[string]any{"competitor_id": competitor, "bout_id": match},
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "only the bout's assigned referee can do this"},
		},
		{
			name:       "refuses a request with no caller",
			body:       map[string]any{"competitor_id": competitor, "bout_id": match},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "refuses a bout with no referee",
			caller:     &referee,
			body:       map[string]any{"competitor_id": competitor, "bout_id": unassigned.ID.String()},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "rejects an unknown bout_id",
			caller:     &referee,
			body:       map[string]any{"competitor_id": competitor, "bout_id": uuid.NewString()},
			wantStatus: http.StatusBadRequest,
			wantFields: map[string]any{"detail": "bout_id must reference an existing bout"},
		},
		{
			name:       "refuses a client-supplied created_by",
			caller:     &referee,
			body:       map[string]any{"created_by": stranger.String(), "competitor_id": competitor, "bout_id": match},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects points below 1 before the handler runs",
			caller:     &referee,
			body:       map[string]any{"competitor_id": competitor, "bout_id": match, "points": 0},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a missing competitor_id",
			caller:     &referee,
			body:       map[string]any{"bout_id": match},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a missing bout_id",
			caller:     &referee,
			body:       map[string]any{"competitor_id": competitor},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a bout_id that is not a uuid",
			caller:     &referee,
			body:       map[string]any{"competitor_id": competitor, "bout_id": "not-a-uuid"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:   "refuses a client-supplied revoked_at",
			caller: &referee,
			body: map[string]any{
				"competitor_id": competitor, "bout_id": match,
				"revoked_at": time.Now().Format(time.RFC3339),
			},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctx := context.Background()
			if tt.caller != nil {
				ctx = asUser(*tt.caller)
			}

			resp := newTestAPI(t, []bout.Bout{refereed, unassigned}).PostCtx(ctx, "/api/v1/scoring", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
			if tt.wantStatus == http.StatusCreated {
				assert.Positive(t, body["id"])
			}
		})
	}
}

func TestGetByIDEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded(1, uuid.New())

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "returns the stored score", path: "1", wantStatus: http.StatusOK},
		{name: "reports an unknown id as not found", path: "999", wantStatus: http.StatusNotFound},
		{name: "rejects an id below the minimum", path: "0", wantStatus: http.StatusUnprocessableEntity},
		{name: "rejects an id that is not a number", path: "abc", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, nil, stored).Get("/api/v1/scoring/" + tt.path)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestListEndpoint(t *testing.T) {
	t.Parallel()

	match := uuid.New()
	otherMatch := uuid.New()

	seed := []scoring.Scoring{
		seeded(1, match),
		seededRevoked(2, match),
		seeded(3, match),
		seeded(4, otherMatch),
	}

	base := "/api/v1/scoring/match/"

	t.Run("returns only active scores for the match, newest first", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, nil, seed...).Get(base + match.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		data, ok := body["data"].([]any)
		require.True(t, ok)
		require.Len(t, data, 2)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 3, data[0].(map[string]any)["id"], 0)
		assert.InDelta(t, 1, data[1].(map[string]any)["id"], 0)
	})

	t.Run("includes revoked scores when asked", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, nil, seed...).Get(base + match.String() + "?include_revoked=true")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 3)
		assert.InDelta(t, 3, body["total"], 0)
	})

	t.Run("returns an empty list for a match with no scores", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, nil, seed...).Get(base + uuid.New().String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Equal(t, []any{}, body["data"])
		assert.InDelta(t, 0, body["total"], 0)
	})

	t.Run("rejects a match id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, nil, seed...).Get(base + "not-a-uuid")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestUpdateEndpoint(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	stranger := uuid.New()
	refereed := bout.Bout{ID: uuid.New(), RefereeID: &referee}
	unassigned := bout.Bout{ID: uuid.New()}
	stored := seeded(1, refereed.ID)
	revoked := seededRevoked(2, refereed.ID)
	unassignedScore := seeded(3, unassigned.ID)
	newCompetitor := uuid.New().String()

	tests := []struct {
		name       string
		caller     *uuid.UUID
		id         int64
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "patches only the fields present in the body",
			caller:     &referee,
			id:         1,
			body:       map[string]any{"points": 3},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{
				"points":        float64(3),
				"competitor_id": stored.CompetitorID.String(),
			},
		},
		{
			name:       "reassigns the competitor",
			caller:     &referee,
			id:         1,
			body:       map[string]any{"competitor_id": newCompetitor},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"competitor_id": newCompetitor},
		},
		{
			name:       "refuses a different signed-in user",
			caller:     &stranger,
			id:         1,
			body:       map[string]any{"points": 3},
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "only the bout's assigned referee can do this"},
		},
		{
			name:       "refuses a request with no caller",
			id:         1,
			body:       map[string]any{"points": 3},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "refuses a bout with no referee",
			caller:     &referee,
			id:         3,
			body:       map[string]any{"points": 3},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "rejects points below 1 before the service runs",
			caller:     &referee,
			id:         1,
			body:       map[string]any{"points": 0},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a competitor_id that is not a uuid",
			caller:     &referee,
			id:         1,
			body:       map[string]any{"competitor_id": "not-a-uuid"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "refuses to change bout_id",
			caller:     &referee,
			id:         1,
			body:       map[string]any{"bout_id": uuid.New().String()},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects an empty patch",
			caller:     &referee,
			id:         1,
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
			wantFields: map[string]any{"detail": "no fields to update"},
		},
		{
			name:       "reports an unknown id as not found",
			caller:     &referee,
			id:         999,
			body:       map[string]any{"points": 2},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "refuses to edit a revoked score",
			caller:     &referee,
			id:         2,
			body:       map[string]any{"points": 2},
			wantStatus: http.StatusConflict,
			wantFields: map[string]any{"detail": "score has been revoked and can no longer be edited"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctx := context.Background()
			if tt.caller != nil {
				ctx = asUser(*tt.caller)
			}

			api := newTestAPI(t, []bout.Bout{refereed, unassigned}, stored, revoked, unassignedScore)
			path := "/api/v1/scoring/" + strconv.FormatInt(tt.id, 10)
			resp := api.PatchCtx(ctx, path, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}

			if tt.wantStatus == http.StatusForbidden {
				unchanged := decodeBody(t, api.Get(path).Body.Bytes())
				assert.InDelta(t, 1, unchanged["points"], 0)
			}
		})
	}
}

func TestRevokeEndpoint(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	stranger := uuid.New()
	refereed := bout.Bout{ID: uuid.New(), RefereeID: &referee}
	unassigned := bout.Bout{ID: uuid.New()}
	stored := seeded(1, refereed.ID)
	unassignedScore := seeded(3, unassigned.ID)

	tests := []struct {
		name       string
		caller     *uuid.UUID
		path       string
		wantStatus int
	}{
		{name: "revokes as the signed-in referee", caller: &referee, path: "1", wantStatus: http.StatusOK},
		{name: "refuses a different signed-in user", caller: &stranger, path: "1", wantStatus: http.StatusForbidden},
		{name: "refuses a request with no caller", path: "1", wantStatus: http.StatusForbidden},
		{name: "refuses a bout with no referee", caller: &referee, path: "3", wantStatus: http.StatusForbidden},
		{name: "reports an unknown id as not found", caller: &referee, path: "999", wantStatus: http.StatusNotFound},
		{name: "rejects an id below the minimum", caller: &referee, path: "0", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctx := context.Background()
			if tt.caller != nil {
				ctx = asUser(*tt.caller)
			}

			api := newTestAPI(t, []bout.Bout{refereed, unassigned}, stored, unassignedScore)
			resp := api.PostCtx(ctx, "/api/v1/scoring/"+tt.path+"/revoke")

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			switch tt.wantStatus {
			case http.StatusOK:
				assert.NotNil(t, body["revoked_at"])
				assert.Equal(t, referee.String(), body["revoked_by"])
			case http.StatusForbidden:
				assert.Equal(t, "only the bout's assigned referee can do this", body["detail"])
				stillLive := decodeBody(t, api.Get("/api/v1/scoring/"+tt.path).Body.Bytes())
				assert.Nil(t, stillLive["revoked_at"])
				assert.Nil(t, stillLive["revoked_by"])
			}
		})
	}
}

func TestRevokeLifecycle(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	match := bout.Bout{ID: uuid.New(), RefereeID: &referee}
	api := newTestAPI(t, []bout.Bout{match}, seeded(1, match.ID))
	ctx := asUser(referee)

	revoked := api.PostCtx(ctx, "/api/v1/scoring/1/revoke")
	require.Equal(t, http.StatusOK, revoked.Code, "body: %s", revoked.Body)

	revokedBody := decodeBody(t, revoked.Body.Bytes())
	assert.NotNil(t, revokedBody["revoked_at"])
	assert.Equal(t, referee.String(), revokedBody["revoked_by"])

	again := api.PostCtx(ctx, "/api/v1/scoring/1/revoke")
	assert.Equal(t, http.StatusConflict, again.Code)

	edit := api.PatchCtx(ctx, "/api/v1/scoring/1", map[string]any{"points": 5})
	require.Equal(t, http.StatusConflict, edit.Code, "body: %s", edit.Body)
	assert.Equal(t, "score has been revoked and can no longer be edited",
		decodeBody(t, edit.Body.Bytes())["detail"])

	live := decodeBody(t, api.Get("/api/v1/scoring/match/"+match.ID.String()).Body.Bytes())
	assert.Empty(t, live["data"])

	replay := decodeBody(t,
		api.Get("/api/v1/scoring/match/"+match.ID.String()+"?include_revoked=true").Body.Bytes())
	assert.Len(t, replay["data"], 1)
}

func TestHistoryEndpoint(t *testing.T) {
	t.Parallel()

	match, seed := historyFixture()

	_, api := humatest.New(t)
	scoring.RegisterScoringService(api,
		scoring.NewScoringService(NewFakeScoringRepository(seed...), NewFakeBoutLookup(match)))

	base := "/api/v1/scoring/match/"

	tests := []struct {
		name     string
		path     string
		wantCode int
	}{
		{name: "returns the history with running totals", path: match.ID.String() + "/history", wantCode: http.StatusOK},
		{name: "reports an unknown bout as not found", path: uuid.NewString() + "/history", wantCode: http.StatusNotFound},
		{name: "rejects a bout id that is not a uuid", path: "not-a-uuid/history", wantCode: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := api.Get(base + tt.path)

			require.Equal(t, tt.wantCode, resp.Code, "body: %s", resp.Body)
			if tt.wantCode != http.StatusOK {
				return
			}

			body := decodeBody(t, resp.Body.Bytes())
			data, ok := body["data"].([]any)
			require.True(t, ok)
			require.NotEmpty(t, data)
			first := data[0].(map[string]any)
			assert.InDelta(t, 3, first["competitor_1_score"], 0)
			assert.InDelta(t, 1, first["competitor_2_score"], 0)
			assert.Len(t, data, 5)

			revokedAt, present := first["revoked_at"]
			assert.True(t, present, "a live score still sends revoked_at, as null")
			assert.Nil(t, revokedAt)
			revoked := data[2].(map[string]any)
			assert.InDelta(t, 3, revoked["id"], 0)
			assert.InDelta(t, 2, revoked["competitor_1_score"], 0)
			assert.InDelta(t, 1, revoked["competitor_2_score"], 0)
			assert.IsType(t, "", revoked["revoked_at"])
		})
	}
}
