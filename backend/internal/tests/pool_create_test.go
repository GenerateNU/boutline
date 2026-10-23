package tests

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/features/pool"
	"boutline/internal/tests/testkit"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	poolCreateStageID   = "f0000000-0000-4000-8000-000000000002"
	poolCreateRefereeID = "a0000000-0000-4000-8000-000000000002"
)

// Seeded competitors are d0000000-0000-4000-8000-0000000000NN for NN 01..12.
func poolCreateCompetitorID(n int) string {
	return fmt.Sprintf("d0000000-0000-4000-8000-%012d", n)
}

func poolCreateToken(t *testing.T, app *fiber.App) string {
	t.Helper()

	login := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/auth/login",
			Method: testkit.POST,
			Body:   map[string]any{"email": "alex.morgan@boutline.dev", "password": "password123"},
		}).
		AssertStatus(http.StatusOK)

	token, ok := login.GetBody()["token"].(string)
	require.True(t, ok, "token field is not a string: %v", login.GetBody())

	return token
}

func poolCreateItem(number int, fencers ...int) map[string]any {
	ids := make([]string, 0, len(fencers))
	for _, n := range fencers {
		ids = append(ids, poolCreateCompetitorID(n))
	}

	return map[string]any{"pool_stage_id": poolCreateStageID, "number": number, "fencers": ids}
}

func poolCreatePost(t *testing.T, app *fiber.App, headers map[string]string, pools ...map[string]any) *testkit.IntegrationTestBuilder {
	t.Helper()

	return testkit.New(t).Request(testkit.Request{
		App:     app,
		Route:   "/api/v1/pools",
		Method:  testkit.POST,
		Headers: headers,
		Body:    map[string]any{"pools": pools},
	})
}

func poolCreateDecode(t *testing.T, result *testkit.IntegrationTestBuilder) []pool.PoolCreatedResponse {
	t.Helper()

	raw, err := json.Marshal(result.GetBody())
	require.NoError(t, err)

	var body pool.PoolCreatedBody
	require.NoError(t, json.Unmarshal(raw, &body))

	return body.Data
}

func poolCreateStageTotal(t *testing.T, app *fiber.App, headers map[string]string) float64 {
	t.Helper()

	result := testkit.New(t).
		Request(testkit.Request{
			App:     app,
			Route:   "/api/v1/pools",
			Method:  testkit.GET,
			Query:   map[string]string{"pool_stage_id": poolCreateStageID},
			Headers: headers,
		}).
		AssertStatus(http.StatusOK)

	total, ok := result.GetBody()["total"].(float64)
	require.True(t, ok, "total field is not a number: %v", result.GetBody())

	return total
}

// Empties the stage, including any pool a failing subtest created by mistake, so
// a rerun against the same database starts clean. Bouts go first: bouts.pool_id
// is RESTRICT.
func poolCreateEmptyStage(t *testing.T, app *fiber.App, headers map[string]string) {
	t.Helper()

	for _, poolID := range poolCreateListIDs(t, app, headers, "/api/v1/pools", "pool_stage_id", poolCreateStageID) {
		for _, boutID := range poolCreateListIDs(t, app, headers, "/api/v1/bouts", "pool_id", poolID) {
			testkit.New(t).
				Request(testkit.Request{App: app, Route: "/api/v1/bouts/" + boutID, Method: testkit.DELETE, Headers: headers}).
				AssertStatus(http.StatusNoContent)
		}
		testkit.New(t).
			Request(testkit.Request{App: app, Route: "/api/v1/pools/" + poolID, Method: testkit.DELETE, Headers: headers}).
			AssertStatus(http.StatusNoContent)
	}
}

func poolCreateListIDs(t *testing.T, app *fiber.App, headers map[string]string, route, filter, value string) []string {
	t.Helper()

	result := testkit.New(t).
		Request(testkit.Request{
			App:     app,
			Route:   route,
			Method:  testkit.GET,
			Query:   map[string]string{filter: value, "limit": "100"},
			Headers: headers,
		}).
		AssertStatus(http.StatusOK)

	rows, ok := result.GetBody()["data"].([]any)
	require.True(t, ok, "data field is not an array")

	ids := make([]string, 0, len(rows))
	for _, row := range rows {
		item, ok := row.(map[string]any)
		require.True(t, ok)
		ids = append(ids, item["id"].(string))
	}
	return ids
}

type poolCreateFixture struct {
	app     *fiber.App
	headers map[string]string
}

func poolCreateAssertLineup(t *testing.T, got pool.PoolCreatedResponse, wantFencers []int, wantBouts [][2]int) {
	t.Helper()

	require.Len(t, got.Fencers, len(wantFencers))
	for i, n := range wantFencers {
		assert.Equal(t, pool.PoolCreatedFencer{CompetitorID: poolCreateCompetitorID(n), Position: i + 1}, got.Fencers[i])
	}

	require.Len(t, got.Bouts, len(wantBouts))
	for i, pair := range wantBouts {
		assert.Equal(t, i+1, got.Bouts[i].PoolOrder)
		assert.Equal(t, poolCreateCompetitorID(pair[0]), got.Bouts[i].Competitor1ID, "bout %d competitor 1", i+1)
		assert.Equal(t, poolCreateCompetitorID(pair[1]), got.Bouts[i].Competitor2ID, "bout %d competitor 2", i+1)
	}
}

func (f poolCreateFixture) assertStoredBouts(t *testing.T, created pool.PoolCreatedResponse) {
	t.Helper()

	result := testkit.New(t).
		Request(testkit.Request{
			App:     f.app,
			Route:   "/api/v1/bouts",
			Method:  testkit.GET,
			Query:   map[string]string{"pool_id": created.ID, "limit": "100"},
			Headers: f.headers,
		}).
		AssertStatus(http.StatusOK).
		AssertField("total", float64(len(created.Bouts)))

	rows, ok := result.GetBody()["data"].([]any)
	require.True(t, ok, "data field is not an array")
	require.Len(t, rows, len(created.Bouts))

	for _, row := range rows {
		bout, ok := row.(map[string]any)
		require.True(t, ok)
		assert.EqualValues(t, 5, bout["points_to_win"])
		assert.EqualValues(t, 180, bout["time_limit_seconds"])
		assert.EqualValues(t, 1, bout["group_number"])
		assert.Equal(t, "Strip 3", bout["location"])
		assert.Equal(t, "upcoming", bout["status"])
		assert.Equal(t, poolCreateRefereeID, bout["referee_id"])
		assert.NotNil(t, bout["pool_order"])
	}
}

// Creates pools through the real service, repository and Postgres so what
// the fake repository cannot prove runs here: the all-or-nothing transaction,
// registration-order positions, the stored bouts, and the unique constraints.
// Subtests share state (the created pools block later numbers and fencers), so
// they run in order and not in parallel.
func TestCreatePoolsAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	headers := map[string]string{"Authorization": "Bearer " + poolCreateToken(t, app)}
	fixture := poolCreateFixture{app: app, headers: headers}
	t.Cleanup(func() { poolCreateEmptyStage(t, app, headers) })

	t.Run("a bad referee rolls back every pool in the request", func(t *testing.T) {
		before := poolCreateStageTotal(t, app, headers)

		second := poolCreateItem(2, 12, 4, 3)
		second["referee_id"] = uuid.NewString()

		poolCreatePost(t, app, headers, poolCreateItem(1, 6, 1, 5, 2), second).
			AssertStatus(http.StatusBadRequest).
			AssertField("detail", "referee_id does not reference an existing record")

		assert.Equal(t, before, poolCreateStageTotal(t, app, headers))
	})

	t.Run("creates pools with fencers in registration order and a bout order", func(t *testing.T) {
		first := poolCreateItem(1, 6, 1, 5, 2)
		first["strip"] = "Strip 3"
		first["referee_id"] = poolCreateRefereeID

		result := poolCreatePost(t, app, headers, first, poolCreateItem(2, 12, 4, 3)).
			AssertStatus(http.StatusCreated)
		created := poolCreateDecode(t, result)

		require.Len(t, created, 2)
		assert.Equal(t, 1, created[0].Number)
		assert.Equal(t, 2, created[1].Number)
		assert.Equal(t, poolCreateStageID, created[0].PoolStageID)

		poolCreateAssertLineup(t, created[0],
			[]int{1, 2, 5, 6},
			[][2]int{{1, 6}, {2, 5}, {1, 5}, {2, 6}, {5, 6}, {1, 2}})
		poolCreateAssertLineup(t, created[1],
			[]int{3, 4, 12},
			[][2]int{{3, 4}, {4, 12}, {12, 3}})

		fixture.assertStoredBouts(t, created[0])
	})

	conflicts := []struct {
		name   string
		pool   map[string]any
		detail string
	}{
		{
			name:   "a fencer already in a pool of the stage is rejected",
			pool:   poolCreateItem(3, 1, 7),
			detail: "competitor " + poolCreateCompetitorID(1) + " is already in a pool of this pool stage",
		},
		{
			name:   "a number already used in the stage is rejected",
			pool:   poolCreateItem(1, 7, 8),
			detail: "a pool with this number already exists in the pool stage",
		},
	}

	for _, tt := range conflicts {
		t.Run(tt.name, func(t *testing.T) {
			poolCreatePost(t, app, headers, tt.pool).
				AssertStatus(http.StatusConflict).
				AssertField("detail", tt.detail)
		})
	}
}
