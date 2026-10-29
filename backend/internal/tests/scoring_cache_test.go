package tests

import (
	"context"
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// scoringCacheTestBoutID is seeded with no scorings (seeds/seed.sql), so any
// history this test sees for it came from this test's own writes.
const (
	scoringCacheTestBoutID       = "e0000000-0000-4000-8000-000000000006"
	scoringCacheTestCompetitorID = "d0000000-0000-4000-8000-000000000002"
	scoringCacheTestCreatedByID  = "a0000000-0000-4000-8000-000000000002"
)

// Proves the cache decorator is actually in the read path, not just wired up
// and unused: a direct database write the API never sees must stay invisible
// in the history response until a write through the API invalidates the
// cache, at which point both writes become visible. A unit test with a fake
// cache can't show this -- it would only prove the decorator's own logic
// runs, not that routes.go actually wires a real Redis connection into it.
func TestScoringHistoryCacheAgainstRealRedis(t *testing.T) {
	app, redisClient, db := testkit.GetDBAndCacheTestApp(t)
	ctx := context.Background()
	cacheKey := "scoring:bout:" + scoringCacheTestBoutID + ":history"
	historyRoute := "/api/v1/scoring/match/" + scoringCacheTestBoutID + "/history"
	headers := authHeaders(t, uuid.MustParse(scoringCacheTestCreatedByID))

	require.NoError(t, redisClient.Del(ctx, cacheKey).Err())
	t.Cleanup(func() {
		_ = db.Exec("DELETE FROM scorings WHERE bout_id = ?", scoringCacheTestBoutID).Error
		_ = redisClient.Del(ctx, cacheKey).Err()
	})

	testkit.New(t).
		Request(testkit.Request{App: app, Route: historyRoute, Method: testkit.GET, Headers: headers}).
		AssertStatus(http.StatusOK).
		AssertArraySize(0)

	exists, err := redisClient.Exists(ctx, cacheKey).Result()
	require.NoError(t, err)
	assert.Equal(t, int64(1), exists, "the GET above should have populated the history cache key")

	require.NoError(t, db.Exec(
		`INSERT INTO scorings (created_by, points, competitor_id, bout_id, created_at, updated_at)
		 VALUES (?, 1, ?, ?, now(), now())`,
		scoringCacheTestCreatedByID, scoringCacheTestCompetitorID, scoringCacheTestBoutID,
	).Error)

	testkit.New(t).
		Request(testkit.Request{App: app, Route: historyRoute, Method: testkit.GET, Headers: headers}).
		AssertStatus(http.StatusOK).
		AssertArraySize(0) // still cached: the direct write stays invisible until invalidated

	testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/scoring",
			Method: testkit.POST,
			Body: map[string]any{
				"created_by":    scoringCacheTestCreatedByID,
				"points":        1,
				"competitor_id": scoringCacheTestCompetitorID,
				"bout_id":       scoringCacheTestBoutID,
			},
			Headers: headers,
		}).
		AssertStatus(http.StatusCreated)

	exists, err = redisClient.Exists(ctx, cacheKey).Result()
	require.NoError(t, err)
	assert.Equal(t, int64(0), exists, "the create above should have invalidated the history cache")

	testkit.New(t).
		Request(testkit.Request{App: app, Route: historyRoute, Method: testkit.GET, Headers: headers}).
		AssertStatus(http.StatusOK).
		AssertArraySize(2) // the direct write and the API write are both visible now
}
