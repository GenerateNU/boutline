package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// Seeded rows from seeds/seed.sql: Fall Open is active, and both fencers are in it.
const (
	activeTournamentID = "b0000000-0000-4000-8000-000000000001"
	fallOpenFencer1ID  = "d0000000-0000-4000-8000-000000000001"
	fallOpenFencer2ID  = "d0000000-0000-4000-8000-000000000002"
)

func TestOnlyTheBoutRefereeRunsIt(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	send := func(t *testing.T, method testkit.HTTPMethod, route string, caller uuid.UUID, body any, wantStatus int) *testkit.IntegrationTestBuilder {
		t.Helper()
		return testkit.New(t).
			Request(testkit.Request{App: app, Route: route, Method: method, Body: body, Headers: authHeaders(t, caller)}).
			AssertStatus(wantStatus)
	}

	referee := uuid.MustParse(startedPoolReferee)
	otherStaff := uuid.MustParse(tournamentRefereeID)

	created := send(t, testkit.POST, "/api/v1/bouts", referee, map[string]any{
		"tournament_id":   activeTournamentID,
		"competitor_1_id": fallOpenFencer1ID,
		"competitor_2_id": fallOpenFencer2ID,
		"points_to_win":   5,
	}, http.StatusCreated).
		AssertField("referee_id", nil).
		GetBody()

	id, ok := created["id"].(string)
	require.True(t, ok, "created bout has no id")
	base := "/api/v1/bouts/" + id
	t.Cleanup(func() {
		send(t, testkit.DELETE, base, referee, nil, http.StatusNoContent)
	})

	send(t, testkit.POST, base+"/start", uuid.New(), nil, http.StatusForbidden).
		AssertField("detail", "only the tournament's staff can referee this bout")

	send(t, testkit.POST, base+"/start", referee, nil, http.StatusOK).
		AssertField("status", "active").
		AssertField("referee_id", referee.String())

	send(t, testkit.POST, base+"/end", otherStaff, nil, http.StatusForbidden).
		AssertField("detail", "only the bout's assigned referee can do this")

	send(t, testkit.POST, base+"/end", referee, nil, http.StatusOK).
		AssertField("status", "ended")
}
