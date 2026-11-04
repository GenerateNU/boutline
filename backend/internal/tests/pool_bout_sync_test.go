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
	fallOpenPoolStage = "f0000000-0000-4000-8000-000000000001"
	alexMorgan        = "a0000000-0000-4000-8000-000000000001"
	jordanLee         = "a0000000-0000-4000-8000-000000000002"
	samRivera         = "a0000000-0000-4000-8000-000000000003"
	mayaChen          = "d0000000-0000-4000-8000-000000000001"
	liamOBrien        = "d0000000-0000-4000-8000-000000000002"
)

// The test builds its own pool and bouts rather than editing seeded ones, so
// the shared database is left as the seed wrote it.
func TestPoolEditReachesItsUpcomingBouts(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	headers := authHeaders(t, uuid.MustParse(alexMorgan))

	send := func(t *testing.T, method testkit.HTTPMethod, route string, body any, wantStatus int) map[string]any {
		t.Helper()

		return testkit.New(t).
			Request(testkit.Request{App: app, Route: route, Method: method, Body: body, Headers: headers}).
			AssertStatus(wantStatus).
			GetBody()
	}
	createdID := func(body map[string]any) string {
		t.Helper()

		id, ok := body["id"].(string)
		require.True(t, ok, "create returned no id: %v", body)

		return id
	}

	poolID := createdID(send(t, testkit.POST, "/api/v1/pools", map[string]any{
		"pool_stage_id": fallOpenPoolStage, "number": 90, "strip": "Strip 9", "referee_id": jordanLee,
	}, http.StatusCreated))
	poolRoute := "/api/v1/pools/" + poolID
	t.Cleanup(func() { send(t, testkit.DELETE, poolRoute, nil, http.StatusNoContent) })

	newBout := func() string {
		route := "/api/v1/bouts/" + createdID(send(t, testkit.POST, "/api/v1/bouts", map[string]any{
			"tournament_id": fallOpen2026, "pool_id": poolID, "referee_id": jordanLee,
			"competitor_1_id": mayaChen, "competitor_2_id": liamOBrien,
			"points_to_win": 5, "location": "Strip 9", "group_number": 90,
		}, http.StatusCreated))
		t.Cleanup(func() { send(t, testkit.DELETE, route, nil, http.StatusNoContent) })

		return route
	}
	upcoming := newBout()
	started := newBout()
	send(t, testkit.POST, started+"/start", nil, http.StatusOK)
	t.Cleanup(func() { send(t, testkit.POST, started+"/end", nil, http.StatusOK) })

	send(t, testkit.PATCH, poolRoute, map[string]any{
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
			body := send(t, testkit.GET, tt.route, nil, http.StatusOK)
			for field, want := range tt.want {
				assert.Equal(t, want, body[field], field)
			}
		})
	}
}
