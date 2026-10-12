package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/poolstage"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, repo *FakePoolStageRepository, events *FakeEventLookup) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	poolstage.RegisterPoolStageService(api, poolstage.NewPoolStageService(repo, events))

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

	parent := seededEvent()

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name: "creates a pool stage and echoes the stored row",
			body: map[string]any{
				"event_id":                parent.ID.String(),
				"max_competitor_per_pool": 6,
			},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"event_id":                parent.ID.String(),
				"max_competitor_per_pool": float64(6),
				"status":                  "upcoming",
			},
		},
		{
			name:       "rejects a missing max_competitor_per_pool before the handler runs",
			body:       map[string]any{"event_id": parent.ID.String()},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "rejects a pool size below two before the handler runs",
			body: map[string]any{
				"event_id":                parent.ID.String(),
				"max_competitor_per_pool": 1,
			},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "rejects an event that does not exist",
			body: map[string]any{
				"event_id":                uuid.New().String(),
				"max_competitor_per_pool": 6,
			},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, NewFakePoolStageRepository(), NewFakeEventLookup(parent)).
				Post("/api/v1/pool-stages", tt.body)

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

	eventID := uuid.New()
	seed := []poolstage.PoolStage{
		seededPoolStage(poolstage.PoolStageStatusUpcoming, eventID),
		seededPoolStage(poolstage.PoolStageStatusActive, eventID),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(seed...), NewFakeEventLookup()).
			Get("/api/v1/pool-stages?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("filters by event_id and status", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(seed...), NewFakeEventLookup()).
			Get("/api/v1/pool-stages?event_id=" + eventID.String() + "&status=active")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.InDelta(t, 1, body["total"], 0)
	})

	t.Run("rejects a status outside the enum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(seed...), NewFakeEventLookup()).
			Get("/api/v1/pool-stages?status=nope")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("rejects a malformed event_id", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(seed...), NewFakeEventLookup()).
			Get("/api/v1/pool-stages?event_id=not-a-uuid")

		assert.Equal(t, http.StatusBadRequest, resp.Code)
	})
}

func TestGetAndUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededPoolStage(poolstage.PoolStageStatusUpcoming, uuid.New())
	base := "/api/v1/pool-stages/"

	t.Run("returns the stored pool stage", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(stored), NewFakeEventLookup()).Get(base + stored.ID.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(stored), NewFakeEventLookup()).Get(base + uuid.New().String())

		assert.Equal(t, http.StatusNotFound, resp.Code)
	})

	t.Run("patches only the fields present in the body", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(stored), NewFakeEventLookup()).
			Patch(base+stored.ID.String(), map[string]any{"max_competitor_per_pool": 4})

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.InDelta(t, 4, body["max_competitor_per_pool"], 0)
	})

	t.Run("rejects a pool size below two before the handler runs", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(stored), NewFakeEventLookup()).
			Patch(base+stored.ID.String(), map[string]any{"max_competitor_per_pool": 1})

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("refuses an empty patch", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolStageRepository(stored), NewFakeEventLookup()).
			Patch(base+stored.ID.String(), map[string]any{})

		assert.Equal(t, http.StatusBadRequest, resp.Code)
	})

	t.Run("refuses to edit an active pool stage", func(t *testing.T) {
		t.Parallel()

		active := seededPoolStage(poolstage.PoolStageStatusActive, uuid.New())

		resp := newTestAPI(t, NewFakePoolStageRepository(active), NewFakeEventLookup()).
			Patch(base+active.ID.String(), map[string]any{"max_competitor_per_pool": 4})

		assert.Equal(t, http.StatusConflict, resp.Code)
	})
}

func TestDeleteEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededPoolStage(poolstage.PoolStageStatusUpcoming, uuid.New())
	api := newTestAPI(t, NewFakePoolStageRepository(stored), NewFakeEventLookup())
	base := "/api/v1/pool-stages/" + stored.ID.String()

	deleted := api.Delete(base)
	require.Equal(t, http.StatusNoContent, deleted.Code, "body: %s", deleted.Body)
	assert.Empty(t, deleted.Body.String())

	assert.Equal(t, http.StatusNotFound, api.Get(base).Code)
	assert.Equal(t, http.StatusNotFound, api.Delete(base).Code)
}

func TestDeleteEndpointRefusals(t *testing.T) {
	t.Parallel()

	t.Run("refuses an active pool stage", func(t *testing.T) {
		t.Parallel()

		stored := seededPoolStage(poolstage.PoolStageStatusActive, uuid.New())
		api := newTestAPI(t, NewFakePoolStageRepository(stored), NewFakeEventLookup())

		assert.Equal(t, http.StatusConflict, api.Delete("/api/v1/pool-stages/"+stored.ID.String()).Code)
	})

	t.Run("refuses a pool stage whose pools have bouts", func(t *testing.T) {
		t.Parallel()

		stored := seededPoolStage(poolstage.PoolStageStatusUpcoming, uuid.New())
		repo := NewFakePoolStageRepository(stored)
		repo.WithBouts[stored.ID] = true

		resp := newTestAPI(t, repo, NewFakeEventLookup()).Delete("/api/v1/pool-stages/" + stored.ID.String())

		require.Equal(t, http.StatusConflict, resp.Code, "body: %s", resp.Body)
		assert.Contains(t, resp.Body.String(), "a pool stage whose pools have bouts cannot be deleted")
		assert.Contains(t, repo.PoolStages, stored.ID)
	})
}
