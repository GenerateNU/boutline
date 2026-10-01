package test

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"
	"time"

	"boutline/internal/features/scoring"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, seed ...scoring.Scoring) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	scoring.RegisterScoringService(api,
		scoring.NewScoringService(NewFakeScoringRepository(seed...)))

	return api
}

func decodeBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func seeded(id int64, matchID uuid.UUID) scoring.Scoring {
	now := time.Now()

	return scoring.Scoring{
		ID:           id,
		CreatedBy:    uuid.New(),
		Points:       1,
		CompetitorID: uuid.New(),
		MatchID:      matchID,
		CreatedAt:    now.Add(time.Duration(id) * time.Second),
		UpdatedAt:    now,
	}
}

func seededRevoked(id int64, matchID uuid.UUID) scoring.Scoring {
	s := seeded(id, matchID)
	revokedAt := time.Now()
	revokedBy := uuid.New()
	s.RevokedAt = &revokedAt
	s.RevokedBy = &revokedBy

	return s
}

func TestCreateEndpoint(t *testing.T) {
	t.Parallel()

	creator := uuid.New().String()
	competitor := uuid.New().String()
	match := uuid.New().String()

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name: "creates a score and echoes the stored row",
			body: map[string]any{
				"created_by": creator, "competitor_id": competitor, "match_id": match, "points": 2,
			},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"created_by":    creator,
				"competitor_id": competitor,
				"match_id":      match,
				"points":        float64(2),
				"revoked_at":    nil,
				"revoked_by":    nil,
			},
		},
		{
			name: "defaults points to 1 when omitted",
			body: map[string]any{
				"created_by": creator, "competitor_id": competitor, "match_id": match,
			},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"points": float64(1)},
		},
		{
			name: "rejects points below 1 before the handler runs",
			body: map[string]any{
				"created_by": creator, "competitor_id": competitor, "match_id": match, "points": 0,
			},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a missing competitor_id",
			body:       map[string]any{"created_by": creator, "match_id": match},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a missing match_id",
			body:       map[string]any{"created_by": creator, "competitor_id": competitor},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "rejects a match_id that is not a uuid",
			body: map[string]any{
				"created_by": creator, "competitor_id": competitor, "match_id": "not-a-uuid",
			},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "refuses a client-supplied revoked_at",
			body: map[string]any{
				"created_by": creator, "competitor_id": competitor, "match_id": match,
				"revoked_at": time.Now().Format(time.RFC3339),
			},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t).Post("/api/v1/scoring", tt.body)

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

			resp := newTestAPI(t, stored).Get("/api/v1/scoring/" + tt.path)

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

	t.Run("returns only active scores for the match, in order", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get(base + match.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		data, ok := body["data"].([]any)
		require.True(t, ok)
		require.Len(t, data, 2)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, data[0].(map[string]any)["id"], 0)
		assert.InDelta(t, 3, data[1].(map[string]any)["id"], 0)
	})

	t.Run("includes revoked scores when asked", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get(base + match.String() + "?include_revoked=true")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 3)
		assert.InDelta(t, 3, body["total"], 0)
	})

	t.Run("returns an empty list for a match with no scores", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get(base + uuid.New().String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Equal(t, []any{}, body["data"])
		assert.InDelta(t, 0, body["total"], 0)
	})

	t.Run("rejects a match id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get(base + "not-a-uuid")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded(1, uuid.New())
	revoked := seededRevoked(2, uuid.New())
	newCompetitor := uuid.New().String()

	tests := []struct {
		name       string
		id         int64
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "patches only the fields present in the body",
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
			id:         1,
			body:       map[string]any{"competitor_id": newCompetitor},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"competitor_id": newCompetitor},
		},
		{
			name:       "rejects points below 1 before the service runs",
			id:         1,
			body:       map[string]any{"points": 0},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a competitor_id that is not a uuid",
			id:         1,
			body:       map[string]any{"competitor_id": "not-a-uuid"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "refuses to change match_id",
			id:         1,
			body:       map[string]any{"match_id": uuid.New().String()},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects an empty patch",
			id:         1,
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
			wantFields: map[string]any{"detail": "no fields to update"},
		},
		{
			name:       "reports an unknown id as not found",
			id:         999,
			body:       map[string]any{"points": 2},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "refuses to edit a revoked score",
			id:         2,
			body:       map[string]any{"points": 2},
			wantStatus: http.StatusConflict,
			wantFields: map[string]any{"detail": "score has been revoked and can no longer be edited"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored, revoked).
				Patch("/api/v1/scoring/"+strconv.FormatInt(tt.id, 10), tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestRevokeEndpoint(t *testing.T) {
	t.Parallel()

	referee := uuid.New().String()

	tests := []struct {
		name       string
		path       string
		body       map[string]any
		wantStatus int
	}{
		{name: "rejects a missing revoked_by", path: "1", body: map[string]any{}, wantStatus: http.StatusUnprocessableEntity},
		{name: "rejects a revoked_by that is not a uuid", path: "1", body: map[string]any{"revoked_by": "nope"}, wantStatus: http.StatusUnprocessableEntity},
		{name: "reports an unknown id as not found", path: "999", body: map[string]any{"revoked_by": referee}, wantStatus: http.StatusNotFound},
		{name: "rejects an id below the minimum", path: "0", body: map[string]any{"revoked_by": referee}, wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, seeded(1, uuid.New())).
				Post("/api/v1/scoring/"+tt.path+"/revoke", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestRevokeLifecycle(t *testing.T) {
	t.Parallel()

	match := uuid.New()
	stored := seeded(1, match)
	api := newTestAPI(t, stored)
	referee := uuid.New().String()

	revoked := api.Post("/api/v1/scoring/1/revoke", map[string]any{"revoked_by": referee})
	require.Equal(t, http.StatusOK, revoked.Code, "body: %s", revoked.Body)

	revokedBody := decodeBody(t, revoked.Body.Bytes())
	assert.NotNil(t, revokedBody["revoked_at"])
	assert.Equal(t, referee, revokedBody["revoked_by"])

	again := api.Post("/api/v1/scoring/1/revoke", map[string]any{"revoked_by": referee})
	assert.Equal(t, http.StatusConflict, again.Code)

	edit := api.Patch("/api/v1/scoring/1", map[string]any{"points": 5})
	require.Equal(t, http.StatusConflict, edit.Code, "body: %s", edit.Body)
	assert.Equal(t, "score has been revoked and can no longer be edited",
		decodeBody(t, edit.Body.Bytes())["detail"])

	live := decodeBody(t, api.Get("/api/v1/scoring/match/"+match.String()).Body.Bytes())
	assert.Empty(t, live["data"])

	replay := decodeBody(t,
		api.Get("/api/v1/scoring/match/"+match.String()+"?include_revoked=true").Body.Bytes())
	assert.Len(t, replay["data"], 1)
}
