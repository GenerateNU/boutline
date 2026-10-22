package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/poolboard"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const poolBoardsPath = "/api/v1/pool-boards"

func newTestAPI(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	poolboard.RegisterPoolBoardService(api, poolboard.NewPoolBoardService(seededBoardRepository()))

	return api
}

func decodeBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func TestListPoolBoardsEndpoint(t *testing.T) {
	t.Parallel()

	t.Run("serialises the board with snake_case keys", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t).Get(poolBoardsPath + "?event_id=" + boardEventID.String())
		require.Equal(t, http.StatusOK, resp.Code)

		body := decodeBody(t, resp.Body.Bytes())
		assert.EqualValues(t, 3, body["total"])

		data, ok := body["data"].([]any)
		require.True(t, ok)
		require.Len(t, data, 3)

		pool1, ok := data[0].(map[string]any)
		require.True(t, ok)
		assert.Equal(t, "active", pool1["status"])
		assert.Equal(t, "Strip 1", pool1["strip"])

		fencers, ok := pool1["fencers"].([]any)
		require.True(t, ok)
		standing, ok := fencers[0].(map[string]any)["standing"].(map[string]any)
		require.True(t, ok)
		assert.EqualValues(t, 1, standing["victory_ratio"])
		assert.EqualValues(t, 1, standing["place"])

		bouts, ok := pool1["bouts"].([]any)
		require.True(t, ok)
		ended, active := bouts[0].(map[string]any), bouts[4].(map[string]any)
		assert.EqualValues(t, 5, ended["competitor_1_score"])
		assert.Equal(t, competitorID(1).String(), ended["winner_id"])
		assert.Contains(t, active, "winner_id")
		assert.Nil(t, active["winner_id"])
	})

	t.Run("an empty pool serialises fencers and bouts as empty arrays", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t).Get(poolBoardsPath + "?event_id=" + boardEventID.String())
		require.Equal(t, http.StatusOK, resp.Code)

		data, ok := decodeBody(t, resp.Body.Bytes())["data"].([]any)
		require.True(t, ok)
		empty, ok := data[2].(map[string]any)
		require.True(t, ok)
		assert.Equal(t, []any{}, empty["fencers"])
		assert.Equal(t, []any{}, empty["bouts"])
	})

	tests := []struct {
		name       string
		query      string
		wantStatus int
	}{
		{name: "rejects a missing event_id before the handler runs", query: "", wantStatus: http.StatusUnprocessableEntity},
		{name: "rejects a limit above the maximum", query: "?event_id=" + boardEventID.String() + "&limit=500", wantStatus: http.StatusUnprocessableEntity},
		{name: "rejects a malformed event_id", query: "?event_id=nope", wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			assert.Equal(t, tt.wantStatus, newTestAPI(t).Get(poolBoardsPath+tt.query).Code)
		})
	}
}

func TestGetPoolBoardEndpoint(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		id         string
		wantStatus int
		wantNumber any
	}{
		{name: "returns the pool", id: boardPool2ID.String(), wantStatus: http.StatusOK, wantNumber: float64(2)},
		{name: "unknown id is not found", id: uuid.New().String(), wantStatus: http.StatusNotFound},
		{name: "rejects a malformed id before the handler runs", id: "nope", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t).Get(poolBoardsPath + "/" + tt.id)

			require.Equal(t, tt.wantStatus, resp.Code)
			if tt.wantStatus == http.StatusOK {
				body := decodeBody(t, resp.Body.Bytes())
				assert.Equal(t, tt.wantNumber, body["number"])
				assert.Equal(t, "ended", body["status"])
			}
		})
	}
}
