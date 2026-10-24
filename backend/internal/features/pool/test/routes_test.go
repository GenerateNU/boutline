package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"

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

	t.Run("creates pools and returns them with fencers and bouts", func(t *testing.T) {
		t.Parallel()

		f := newCreateFixture()
		resp := newTestAPI(t, f.repo, f.lookup).Post("/api/v1/pools", map[string]any{
			"pools": []any{map[string]any{
				"pool_stage_id": f.stage.ID.String(),
				"number":        2,
				"strip":         "Strip 3",
				"start_time":    "2026-10-24T09:30:00Z",
				"referee_id":    f.referee.String(),
				"fencers":       fencerIDs(1, 2, 3, 4),
			}},
			"points_to_win":      15,
			"time_limit_seconds": 540,
		})

		require.Equal(t, http.StatusCreated, resp.Code, "body: %s", resp.Body)

		data := decodeBody(t, resp.Body.Bytes())["data"].([]any)
		require.Len(t, data, 1)
		created := data[0].(map[string]any)
		assert.Equal(t, f.stage.ID.String(), created["pool_stage_id"])
		assert.InDelta(t, 2, created["number"], 0)
		assert.Equal(t, "Strip 3", created["strip"])
		assert.Equal(t, "2026-10-24T09:30:00Z", created["start_time"])
		assert.Equal(t, f.referee.String(), created["referee_id"])

		fencers := created["fencers"].([]any)
		require.Len(t, fencers, 4)
		first := fencers[0].(map[string]any)
		assert.Equal(t, competitor(2).String(), first["competitor_id"])
		assert.InDelta(t, 1, first["position"], 0)

		bouts := created["bouts"].([]any)
		require.Len(t, bouts, 6)
		firstBout := bouts[0].(map[string]any)
		assert.InDelta(t, 1, firstBout["pool_order"], 0)
		assert.NotEmpty(t, firstBout["id"])
		assert.NotEmpty(t, firstBout["competitor_1_id"])
		assert.NotEmpty(t, firstBout["competitor_2_id"])

		require.Len(t, f.repo.Bouts, 6)
		for _, bout := range f.repo.Bouts {
			assert.Equal(t, 15, bout.PointsToWin)
			assert.Equal(t, 540, bout.TimeLimitSeconds)
		}
	})

	t.Run("defaults points_to_win and time_limit_seconds", func(t *testing.T) {
		t.Parallel()

		f := newCreateFixture()
		resp := newTestAPI(t, f.repo, f.lookup).Post("/api/v1/pools", map[string]any{
			"pools": []any{map[string]any{
				"pool_stage_id": f.stage.ID.String(),
				"number":        1,
				"fencers":       fencerIDs(1, 2),
			}},
		})

		require.Equal(t, http.StatusCreated, resp.Code, "body: %s", resp.Body)

		created := decodeBody(t, resp.Body.Bytes())["data"].([]any)[0].(map[string]any)
		assert.Nil(t, created["referee_id"])
		assert.Nil(t, created["strip"])
		assert.Nil(t, created["start_time"])

		require.Len(t, f.repo.Bouts, 1)
		assert.Equal(t, 5, f.repo.Bouts[0].PointsToWin)
		assert.Equal(t, 180, f.repo.Bouts[0].TimeLimitSeconds)
	})

	t.Run("rejects malformed bodies before the handler runs", func(t *testing.T) {
		t.Parallel()

		f := newCreateFixture()
		pools := func(item map[string]any) map[string]any {
			return map[string]any{"pools": []any{item}}
		}
		item := func(number int, fencers []string) map[string]any {
			return map[string]any{"pool_stage_id": f.stage.ID.String(), "number": number, "fencers": fencers}
		}

		tests := []struct {
			name string
			body map[string]any
		}{
			{"empty pools", map[string]any{"pools": []any{}}},
			{"missing pools", map[string]any{}},
			{"one fencer", pools(item(1, fencerIDs(1)))},
			{"eleven fencers", pools(item(1, fencerIDs(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)))},
			{"non-uuid fencer", pools(item(1, []string{competitor(1).String(), "not-a-uuid"}))},
			{"zero number", pools(item(0, fencerIDs(1, 2)))},
			{"zero points_to_win", map[string]any{
				"pools":         []any{item(1, fencerIDs(1, 2))},
				"points_to_win": 0,
			}},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()

				resp := newTestAPI(t, f.repo, f.lookup).Post("/api/v1/pools", tt.body)

				assert.Equal(t, http.StatusUnprocessableEntity, resp.Code, "body: %s", resp.Body)
				assert.Empty(t, f.repo.Pools)
			})
		}
	})
}

func fencerIDs(ns ...int) []string {
	ids := make([]string, 0, len(ns))
	for _, n := range ns {
		ids = append(ids, competitor(n).String())
	}

	return ids
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
			Patch("/api/v1/pools/"+stored.ID.String(), map[string]any{
				"referee_id": referee,
				"number":     4,
				"strip":      "Strip 2",
			})

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Equal(t, referee, body["referee_id"])
		assert.InDelta(t, 4, body["number"], 0)
		assert.Equal(t, "Strip 2", body["strip"])
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
func TestLifecycleEndpoints(t *testing.T) {
	t.Parallel()

	stage := seededPoolStage()
	stage.Status = poolstage.PoolStageStatusActive
	stored := seededPool(stage.ID)
	stored.RefereeID = ptr(uuid.New())
	api := newTestAPI(t, NewFakePoolRepository(stored), NewFakePoolStageLookup(stage))
	base := "/api/v1/pools/" + stored.ID.String()

	started := api.Post(base + "/start")
	require.Equal(t, http.StatusOK, started.Code, "body: %s", started.Body)
	startedBody := decodeBody(t, started.Body.Bytes())
	assert.NotNil(t, startedBody["started_at"])
	assert.Nil(t, startedBody["completed_at"])

	ended := api.Post(base + "/end")
	require.Equal(t, http.StatusOK, ended.Code, "body: %s", ended.Body)
	endedBody := decodeBody(t, ended.Body.Bytes())
	assert.Equal(t, startedBody["started_at"], endedBody["started_at"])
	assert.NotNil(t, endedBody["completed_at"])
}
