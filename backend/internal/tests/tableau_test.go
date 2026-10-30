package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	openEpeeEventID  = "c0000000-0000-4000-8000-000000000004"
	mixedEpeeEventID = "c0000000-0000-4000-8000-000000000001"
)

func TestGetTableau(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	getTableau := func(t *testing.T, eventID string, wantStatus int) *testkit.IntegrationTestBuilder {
		t.Helper()
		return testkit.New(t).
			Request(testkit.Request{
				App:     app,
				Route:   "/api/v1/events/" + eventID + "/tableau",
				Method:  testkit.GET,
				Headers: authHeaders(t, searchTestUserID),
			}).
			AssertStatus(wantStatus)
	}

	t.Run("drawn event lists rounds largest first", func(t *testing.T) {
		rounds := tableauRounds(t, getTableau(t, openEpeeEventID, http.StatusOK).GetBody())
		require.Len(t, rounds, 2)
		assert.EqualValues(t, 4, rounds[0]["size"])
		assert.EqualValues(t, 2, rounds[1]["size"])
	})

	t.Run("first semifinal has the top seed above the bottom seed", func(t *testing.T) {
		rounds := tableauRounds(t, getTableau(t, openEpeeEventID, http.StatusOK).GetBody())
		semis := tableauBouts(t, rounds[0])
		require.Len(t, semis, 2)

		assert.EqualValues(t, 1, semis[0]["slot"])
		top := semis[0]["top"].(map[string]any)
		bottom := semis[0]["bottom"].(map[string]any)
		assert.Equal(t, "Maya", top["first_name"])
		assert.Equal(t, "Chen", top["last_name"])
		assert.EqualValues(t, 1, top["seed"])
		assert.Equal(t, "Kenji", bottom["first_name"])
		assert.Equal(t, "Tanaka", bottom["last_name"])
		assert.EqualValues(t, 4, bottom["seed"])
	})

	t.Run("finished final reports both scores", func(t *testing.T) {
		rounds := tableauRounds(t, getTableau(t, openEpeeEventID, http.StatusOK).GetBody())
		final := tableauBouts(t, rounds[1])
		require.Len(t, final, 1)

		assert.NotNil(t, final[0]["top_score"])
		assert.NotNil(t, final[0]["bottom_score"])
	})

	t.Run("event without a drawn tableau returns no rounds", func(t *testing.T) {
		getTableau(t, mixedEpeeEventID, http.StatusOK).
			AssertField("rounds", []any{})
	})

	t.Run("unknown event is not found", func(t *testing.T) {
		getTableau(t, uuid.NewString(), http.StatusNotFound)
	})
}

func tableauRounds(t *testing.T, body map[string]any) []map[string]any {
	t.Helper()
	return asObjects(t, body["rounds"], "rounds")
}

func tableauBouts(t *testing.T, round map[string]any) []map[string]any {
	t.Helper()
	return asObjects(t, round["bouts"], "bouts")
}

func asObjects(t *testing.T, value any, name string) []map[string]any {
	t.Helper()
	items, ok := value.([]any)
	require.True(t, ok, "%s is not an array: %v", name, value)
	objects := make([]map[string]any, len(items))
	for i, item := range items {
		objects[i], ok = item.(map[string]any)
		require.True(t, ok, "%s[%d] is not an object", name, i)
	}
	return objects
}
