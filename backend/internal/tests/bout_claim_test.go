package tests

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The unassigned check lives in the claim UPDATE's WHERE clause, which the unit
// fakes can't exercise, so this is the only proof that two referees racing for
// one bout can't both win.
func TestConcurrentClaimsHaveOneWinner(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	created := send(t, app, testkit.POST, "/api/v1/bouts", map[string]any{
		"tournament_id": fallOpen2026, "competitor_1_id": sofiaRusso, "competitor_2_id": lenaFisher,
		"points_to_win": 5,
	}, http.StatusCreated)
	route := "/api/v1/bouts/" + createdID(t, created)
	t.Cleanup(func() { send(t, app, testkit.DELETE, route, nil, http.StatusNoContent) })

	referees := []string{jordanLee, samRivera}
	statuses := make([]int, len(referees))
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i, referee := range referees {
		wg.Go(func() {
			<-start
			statuses[i] = claimStatus(t, app, referee, route+"/claim")
		})
	}
	close(start)
	wg.Wait()

	require.ElementsMatch(t, []int{http.StatusOK, http.StatusConflict}, statuses)
	winner := referees[0]
	if statuses[1] == http.StatusOK {
		winner = referees[1]
	}

	stored := send(t, app, testkit.GET, route, nil, http.StatusOK)
	assert.Equal(t, winner, stored["referee_id"])

	again := sendAs(t, app, winner, testkit.POST, route+"/claim", nil, http.StatusOK)
	assert.Equal(t, winner, again["referee_id"])
}

// claimStatus returns the status instead of asserting it, because the losing
// claimant's 409 is the expected outcome and the goroutine can't fail the test fatally.
func claimStatus(t *testing.T, app *fiber.App, caller, route string) int {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, route, nil)
	for key, value := range authHeaders(t, uuid.MustParse(caller)) {
		req.Header.Set(key, value)
	}
	resp, err := app.Test(req)
	if !assert.NoError(t, err) {
		return 0
	}
	_ = resp.Body.Close()

	return resp.StatusCode
}
