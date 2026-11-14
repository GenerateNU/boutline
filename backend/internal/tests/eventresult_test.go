package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListEventResults(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	getResults := func(t *testing.T, eventID, query string, wantStatus int) *testkit.IntegrationTestBuilder {
		t.Helper()
		return testkit.New(t).
			Request(testkit.Request{
				App:     app,
				Route:   "/api/v1/events/" + eventID + "/results" + query,
				Method:  testkit.GET,
				Headers: authHeaders(t, searchTestUserID),
			}).
			AssertStatus(wantStatus)
	}

	type result struct {
		place        int
		first, last  string
		club, rating string
	}
	want := []result{
		{1, "Maya", "Chen", "Boston Fencing Club", "A"},
		{2, "Hana", "Sato", "Northeastern Fencing", "A"},
		{3, "Sofia", "Rossi", "Boston Fencing Club", "C"},
		{3, "Kenji", "Tanaka", "Northeastern Fencing", "U"},
	}
	assertRows := func(t *testing.T, rows []map[string]any, want []result) {
		t.Helper()
		require.Len(t, rows, len(want))
		for i, w := range want {
			assert.EqualValues(t, w.place, rows[i]["place"], "row %d place", i)
			assert.Equal(t, w.first, rows[i]["first_name"], "row %d first name", i)
			assert.Equal(t, w.last, rows[i]["last_name"], "row %d last name", i)
			assert.Equal(t, w.club, rows[i]["club"], "row %d club", i)
			assert.Equal(t, w.rating, rows[i]["rating"], "row %d rating", i)
			assert.Equal(t, "direct_elimination", rows[i]["decided_by"], "row %d decided_by", i)
		}
	}

	t.Run("ended tableau classifies its four fencers", func(t *testing.T) {
		body := getResults(t, openEpeeEventID, "", http.StatusOK).GetBody()

		assert.EqualValues(t, 4, body["total"])
		assertRows(t, asObjects(t, body["data"], "data"), want)
	})

	t.Run("a page is a slice of the classification", func(t *testing.T) {
		body := getResults(t, openEpeeEventID, "?limit=2&offset=2", http.StatusOK).GetBody()

		assert.EqualValues(t, 4, body["total"])
		assertRows(t, asObjects(t, body["data"], "data"), want[2:])
	})

	t.Run("event with no ended stage has no results", func(t *testing.T) {
		getResults(t, mixedEpeeEventID, "", http.StatusOK).
			AssertField("data", []any{})
	})

	t.Run("unknown event is not found", func(t *testing.T) {
		getResults(t, uuid.NewString(), "", http.StatusNotFound)
	})
}
