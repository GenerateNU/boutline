package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// Seeded rows from seeds/seed.sql: both pool stages belong to tournament b…01.
const (
	upcomingPoolStageID = "f0000000-0000-4000-8000-000000000002"
	startedPoolID       = "f1000000-0000-4000-8000-000000000001"
	startedPoolReferee  = "a0000000-0000-4000-8000-000000000002"
	tournamentAdminID   = "a0000000-0000-4000-8000-000000000004"
	tournamentRefereeID = "a0000000-0000-4000-8000-000000000003"
)

func TestPoolRefereeMustBeStaff(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	headers := authHeaders(t, searchTestUserID)

	send := func(t *testing.T, method testkit.HTTPMethod, route string, body map[string]any, wantStatus int) *testkit.IntegrationTestBuilder {
		t.Helper()
		return testkit.New(t).
			Request(testkit.Request{App: app, Route: route, Method: method, Body: body, Headers: headers}).
			AssertStatus(wantStatus)
	}

	t.Run("creates a pool refereed by a tournament admin", func(t *testing.T) {
		created := send(t, testkit.POST, "/api/v1/pools",
			map[string]any{"pool_stage_id": upcomingPoolStageID, "referee_id": tournamentAdminID},
			http.StatusCreated).
			AssertField("referee_id", tournamentAdminID).
			GetBody()

		id, ok := created["id"].(string)
		require.True(t, ok, "created pool has no id")
		t.Cleanup(func() {
			send(t, testkit.DELETE, "/api/v1/pools/"+id, nil, http.StatusNoContent)
		})
	})

	t.Run("refuses to create a pool refereed by someone outside the staff", func(t *testing.T) {
		send(t, testkit.POST, "/api/v1/pools",
			map[string]any{"pool_stage_id": upcomingPoolStageID, "referee_id": uuid.NewString()},
			http.StatusBadRequest).
			AssertField("detail", "referee_id must reference a staff member of the tournament")
	})

	t.Run("reassigns a pool to another referee on the staff", func(t *testing.T) {
		t.Cleanup(func() {
			send(t, testkit.PATCH, "/api/v1/pools/"+startedPoolID,
				map[string]any{"referee_id": startedPoolReferee}, http.StatusOK)
		})

		send(t, testkit.PATCH, "/api/v1/pools/"+startedPoolID,
			map[string]any{"referee_id": tournamentRefereeID}, http.StatusOK).
			AssertField("referee_id", tournamentRefereeID)
	})

	t.Run("refuses to reassign a pool to someone outside the staff", func(t *testing.T) {
		send(t, testkit.PATCH, "/api/v1/pools/"+startedPoolID,
			map[string]any{"referee_id": uuid.NewString()}, http.StatusBadRequest).
			AssertField("detail", "referee_id must reference a staff member of the tournament")
	})
}
