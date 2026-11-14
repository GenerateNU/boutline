package tests

import (
	"net/http"
	"sync"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	fallOpenPoolStage = "f0000000-0000-4000-8000-000000000001"
	alexMorgan        = "a0000000-0000-4000-8000-000000000001"
	jordanLee         = "a0000000-0000-4000-8000-000000000002"
	samRivera         = "a0000000-0000-4000-8000-000000000003"
	mayaChen          = "d0000000-0000-4000-8000-000000000001"
	liamOBrien        = "d0000000-0000-4000-8000-000000000002"
)

// These tests build their own pools and bouts rather than editing seeded ones,
// so the shared database is left as the seed wrote it. Each uses its own pool
// number so they can't collide.
func TestPoolEditReachesItsUpcomingBouts(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	poolID := createPool(t, app, 90)
	poolRoute := "/api/v1/pools/" + poolID

	upcoming := createPoolBout(t, app, poolID)
	started := createPoolBout(t, app, poolID)
	// Only the bout's assigned referee, Jordan through the pool, may start and end it.
	sendAs(t, app, jordanLee, testkit.POST, started+"/start", nil, http.StatusOK)
	t.Cleanup(func() { sendAs(t, app, jordanLee, testkit.POST, started+"/end", nil, http.StatusOK) })

	send(t, app, testkit.PATCH, poolRoute, map[string]any{
		"number": 91, "strip": "Strip 10", "referee_id": samRivera,
	}, http.StatusOK)

	tests := []struct {
		name  string
		route string
		want  map[string]any
	}{
		{
			name:  "upcoming bout follows the pool",
			route: upcoming,
			want:  map[string]any{"location": "Strip 10", "group_number": float64(91), "referee_id": samRivera},
		},
		{
			name:  "started bout keeps what it was fenced with",
			route: started,
			want:  map[string]any{"location": "Strip 9", "group_number": float64(90), "referee_id": jordanLee},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := send(t, app, testkit.GET, tt.route, nil, http.StatusOK)
			for field, want := range tt.want {
				assert.Equal(t, want, body[field], field)
			}
		})
	}
}

func TestConcurrentPoolBoutsTakeDistinctSlots(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	poolID := createPool(t, app, 92)

	const creates = 5
	bodies := make([]map[string]any, creates)
	var wg sync.WaitGroup
	for i := range creates {
		wg.Go(func() {
			bodies[i] = send(t, app, testkit.POST, "/api/v1/bouts", poolBoutBody(poolID), http.StatusCreated)
		})
	}
	wg.Wait()

	// Clean up every bout that was created before asserting, so one failed
	// create can't leave the rest behind and block the pool's deletion.
	slots := make([]any, 0, creates)
	for _, body := range bodies {
		if id, ok := body["id"].(string); ok {
			t.Cleanup(func() { send(t, app, testkit.DELETE, "/api/v1/bouts/"+id, nil, http.StatusNoContent) })
		}
		slots = append(slots, body["slot"])
	}

	assert.ElementsMatch(t, []any{float64(1), float64(2), float64(3), float64(4), float64(5)}, slots)
}

func TestPoolBoutCopiesItsPool(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	poolID := createPool(t, app, 93)

	body := poolBoutBody(poolID)
	body["referee_id"], body["location"], body["group_number"] = samRivera, "Strip 1", 1
	created := send(t, app, testkit.POST, "/api/v1/bouts", body, http.StatusCreated)
	route := "/api/v1/bouts/" + createdID(t, created)
	t.Cleanup(func() { send(t, app, testkit.DELETE, route, nil, http.StatusNoContent) })

	assert.Equal(t, jordanLee, created["referee_id"])
	assert.Equal(t, "Strip 9", created["location"])
	assert.Equal(t, float64(93), created["group_number"])
}

// Creates race a pool edit; whichever order they land in, every upcoming bout
// must end up with the pool's final strip, number and referee.
func TestPoolBoutsCreatedDuringAnEditMatchThePool(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	poolID := createPool(t, app, 94)

	const creates = 5
	bodies := make([]map[string]any, creates)
	var wg sync.WaitGroup
	for i := range creates {
		wg.Go(func() {
			bodies[i] = send(t, app, testkit.POST, "/api/v1/bouts", poolBoutBody(poolID), http.StatusCreated)
		})
	}
	wg.Go(func() {
		send(t, app, testkit.PATCH, "/api/v1/pools/"+poolID, map[string]any{
			"number": 95, "strip": "Strip 11", "referee_id": samRivera,
		}, http.StatusOK)
	})
	wg.Wait()

	for _, body := range bodies {
		id, ok := body["id"].(string)
		if !ok {
			continue
		}
		route := "/api/v1/bouts/" + id
		t.Cleanup(func() { send(t, app, testkit.DELETE, route, nil, http.StatusNoContent) })

		stored := send(t, app, testkit.GET, route, nil, http.StatusOK)
		assert.Equal(t, "Strip 11", stored["location"], id)
		assert.Equal(t, float64(95), stored["group_number"], id)
		assert.Equal(t, samRivera, stored["referee_id"], id)
	}
}

func createPool(t *testing.T, app *fiber.App, number int) string {
	t.Helper()

	id := createdID(t, send(t, app, testkit.POST, "/api/v1/pools", map[string]any{
		"pool_stage_id": fallOpenPoolStage, "number": number, "strip": "Strip 9", "referee_id": jordanLee,
	}, http.StatusCreated))
	t.Cleanup(func() { send(t, app, testkit.DELETE, "/api/v1/pools/"+id, nil, http.StatusNoContent) })

	return id
}

func createPoolBout(t *testing.T, app *fiber.App, poolID string) string {
	t.Helper()

	route := "/api/v1/bouts/" + createdID(t, send(t, app, testkit.POST, "/api/v1/bouts", poolBoutBody(poolID), http.StatusCreated))
	t.Cleanup(func() { send(t, app, testkit.DELETE, route, nil, http.StatusNoContent) })

	return route
}

func poolBoutBody(poolID string) map[string]any {
	return map[string]any{
		"tournament_id": fallOpen2026, "pool_id": poolID, "referee_id": jordanLee,
		"competitor_1_id": mayaChen, "competitor_2_id": liamOBrien,
		"points_to_win": 5, "location": "Strip 9", "group_number": 90,
	}
}

func createdID(t *testing.T, body map[string]any) string {
	t.Helper()

	id, ok := body["id"].(string)
	require.True(t, ok, "create returned no id: %v", body)

	return id
}

func send(t *testing.T, app *fiber.App, method testkit.HTTPMethod, route string, body any, wantStatus int) map[string]any {
	t.Helper()

	return sendAs(t, app, alexMorgan, method, route, body, wantStatus)
}

func sendAs(
	t *testing.T, app *fiber.App, caller string, method testkit.HTTPMethod, route string, body any, wantStatus int,
) map[string]any {
	t.Helper()

	return testkit.New(t).
		Request(testkit.Request{
			App: app, Route: route, Method: method, Body: body,
			Headers: authHeaders(t, uuid.MustParse(caller)),
		}).
		AssertStatus(wantStatus).
		GetBody()
}
