package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/bout"
	"boutline/internal/features/tableau"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func (f fixture) api(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	tableau.RegisterTableauService(api, f.service())

	return api
}

func TestTableauEndpoint(t *testing.T) {
	t.Parallel()

	semi := boutRow(4, 1, bout.BoutStatusUpcoming)
	drawn := newFixture(4, semi)
	empty := newFixture(4)
	undrawn := newFixture(4)
	undrawn.repo.Tableaus = nil

	tests := []struct {
		name       string
		fx         fixture
		id         string
		wantStatus int
		wantRounds string
	}{
		{name: "bad id is rejected", fx: empty, id: "nope", wantStatus: http.StatusUnprocessableEntity},
		{name: "unknown event is 404", fx: empty, id: uuid.NewString(), wantStatus: http.StatusNotFound},
		{name: "undrawn serializes rounds as an empty array", fx: undrawn, wantStatus: http.StatusOK, wantRounds: `[]`},
		{
			name: "empty rounds serialize bouts as an empty array", fx: empty, wantStatus: http.StatusOK,
			wantRounds: `[{"size":4,"bouts":[]},{"size":2,"bouts":[]}]`,
		},
		{name: "drawn bout uses the snake_case wire format", fx: drawn, wantStatus: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			id := tt.id
			if id == "" {
				id = tt.fx.eventID.String()
			}
			resp := tt.fx.api(t).Get("/api/v1/events/" + id + "/tableau")

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
			if tt.wantRounds != "" {
				var body struct {
					Rounds json.RawMessage `json:"rounds"`
				}
				require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
				assert.JSONEq(t, tt.wantRounds, string(body.Rounds))
			}
		})
	}

	t.Run("bout fields", func(t *testing.T) {
		t.Parallel()

		resp := drawn.api(t).Get("/api/v1/events/" + drawn.eventID.String() + "/tableau")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		var body map[string]any
		require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
		got := body["rounds"].([]any)[0].(map[string]any)["bouts"].([]any)[0].(map[string]any)

		assert.Equal(t, semi.ID.String(), got["id"])
		assert.EqualValues(t, 1, got["slot"])
		assert.Nil(t, got["top_score"])
		assert.Nil(t, got["bottom_score"])
		assert.Equal(t, map[string]any{
			"id": semi.TopID.String(), "first_name": "Maya", "last_name": "Chen",
			"club": "Boston Fencing Club", "seed": float64(1),
		}, got["top"])
	})
}
