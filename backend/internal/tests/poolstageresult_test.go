package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Exercises the pool stage result SQL against seeds/seed.sql: fencers and pool numbers
// derived from the stage's bouts, the club fallback, the rating and pool strip, and the tableau entrant lookup
// on a direct elimination that has not been drawn.
func TestListPoolStageResults(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	getResults := func(t *testing.T, eventID, query string, wantStatus int) *testkit.IntegrationTestBuilder {
		t.Helper()
		return testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/events/" + eventID + "/pool-stage-results" + query,
				Method: testkit.GET,
			}).
			AssertStatus(wantStatus)
	}

	type result struct {
		place      int
		last       string
		club       any
		rating     string
		poolNumber int
		strip      string
	}
	// Mixed Épée's two pools of four, mid-way through, ranked together.
	want := []result{
		{1, "Chen", "Boston Fencing Club", "A", 1, "Strip 1"},
		{2, "Sato", "Northeastern Fencing", "A", 2, "Strip 2"},
		{3, "Kowalski", nil, "E", 2, "Strip 2"},
		{4, "Patel", "Cambridge FC", "C", 1, "Strip 1"},
		{5, "Martinez", nil, "U", 1, "Strip 1"},
		{6, "Okafor", "Cambridge FC", "B", 2, "Strip 2"},
		{7, "Williams", "Boston Fencing Club", "D", 2, "Strip 2"},
		{8, "O'Brien", "Northeastern Fencing", "B", 1, "Strip 1"},
	}
	assertRows := func(t *testing.T, rows []map[string]any, want []result) {
		t.Helper()
		require.Len(t, rows, len(want))
		for i, w := range want {
			assert.EqualValues(t, w.place, rows[i]["place"], "row %d place", i)
			assert.Equal(t, w.last, rows[i]["last_name"], "row %d last name", i)
			assert.Equal(t, w.club, rows[i]["club"], "row %d club", i)
			assert.Equal(t, w.rating, rows[i]["rating"], "row %d rating", i)
			assert.Contains(t, rows[i], "rating_year", "row %d rating year key", i)
			assert.Nil(t, rows[i]["rating_year"], "row %d rating year", i)
			assert.EqualValues(t, w.poolNumber, rows[i]["pool_number"], "row %d pool number", i)
			assert.Equal(t, w.strip, rows[i]["strip"], "row %d strip", i)
			assert.Equal(t, "pending", rows[i]["status"], "row %d status", i)
		}
	}

	t.Run("ranks both pools of an active stage before the draw", func(t *testing.T) {
		body := getResults(t, mixedEpeeEventID, "", http.StatusOK).GetBody()

		assert.EqualValues(t, 8, body["total"])
		assertRows(t, asObjects(t, body["data"], "data"), want)
	})

	t.Run("event with no pool stage has no results", func(t *testing.T) {
		getResults(t, openEpeeEventID, "", http.StatusOK).
			AssertField("data", []any{})
	})

	t.Run("unknown event is not found", func(t *testing.T) {
		getResults(t, uuid.NewString(), "", http.StatusNotFound)
	})
}
