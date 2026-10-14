package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/pool"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, repo *FakePoolRepository, stages *FakePoolStageLookup) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	pool.RegisterPoolService(api, pool.NewPoolService(repo, stages))

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

	stage := seededPoolStage()
	referee := uuid.New().String()

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "creates a pool and echoes the stored row",
			body:       map[string]any{"pool_stage_id": stage.ID.String(), "referee_id": referee},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"pool_stage_id": stage.ID.String(), "referee_id": referee},
		},
		{
			name:       "returns a null referee_id when none is given",
			body:       map[string]any{"pool_stage_id": stage.ID.String()},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"pool_stage_id": stage.ID.String(), "referee_id": nil},
		},
		{
			name:       "rejects a missing pool_stage_id before the handler runs",
			body:       map[string]any{},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, NewFakePoolRepository(), NewFakePoolStageLookup(stage)).Post("/api/v1/pools", tt.body)

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

	stageID := uuid.New()
	seed := []pool.Pool{seededPool(stageID), seededPool(stageID), seededPool(uuid.New())}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolRepository(seed...), NewFakePoolStageLookup()).Get("/api/v1/pools?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 3, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("filters by pool_stage_id", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolRepository(seed...), NewFakePoolStageLookup()).
			Get("/api/v1/pools?pool_stage_id=" + stageID.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.InDelta(t, 2, body["total"], 0)
	})

	t.Run("rejects a limit above the maximum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolRepository(seed...), NewFakePoolStageLookup()).Get("/api/v1/pools?limit=500")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestGetAndUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededPool(uuid.New())
	referee := uuid.New().String()

	t.Run("returns the stored pool", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolRepository(stored), NewFakePoolStageLookup()).
			Get("/api/v1/pools/" + stored.ID.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
	})

	t.Run("assigns a referee", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakePoolRepository(stored), NewFakePoolStageLookup()).
			Patch("/api/v1/pools/"+stored.ID.String(), map[string]any{"referee_id": referee})

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Equal(t, referee, body["referee_id"])
	})
}

func TestDeleteEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededPool(uuid.New())
	api := newTestAPI(t, NewFakePoolRepository(stored), NewFakePoolStageLookup())
	base := "/api/v1/pools/" + stored.ID.String()

	deleted := api.Delete(base)
	require.Equal(t, http.StatusNoContent, deleted.Code, "body: %s", deleted.Body)
	assert.Empty(t, deleted.Body.String())

	assert.Equal(t, http.StatusNotFound, api.Get(base).Code)
	assert.Equal(t, http.StatusNotFound, api.Delete(base).Code)
}
