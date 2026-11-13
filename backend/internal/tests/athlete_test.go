package tests

import (
	"fmt"
	"math/rand/v2"
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Belongs to the private, pending Winter Classic 2026.
const openSabreEventID = "c0000000-0000-4000-8000-000000000003"

func randomMemberNumber() string {
	return fmt.Sprintf("1%08d", rand.IntN(100_000_000))
}

func createAthleteCompetitor(t *testing.T, app *fiber.App, eventID, memberNumber, lastName string) map[string]any {
	t.Helper()

	body := send(t, app, testkit.POST, "/api/v1/competitors", map[string]any{
		"eventId": eventID, "firstName": "Ottoline", "lastName": lastName,
		"gender": "F", "birthdate": "1999-05-17", "division": "Massachusetts",
		"memberNumber": memberNumber,
	}, http.StatusCreated)
	id := createdID(t, body)
	t.Cleanup(func() { send(t, app, testkit.DELETE, "/api/v1/competitors/"+id, nil, http.StatusNoContent) })

	return body
}

func TestAthleteLinkingAndReads(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	memberNumber := randomMemberNumber()

	var athleteID, competitorID string
	for _, eventID := range []string{openEpeeEventID, mixedEpeeEventID, openSabreEventID} {
		body := createAthleteCompetitor(t, app, eventID, memberNumber, "Vanderquist")

		id, ok := body["athleteId"].(string)
		require.True(t, ok, "competitor in event %s has no athleteId: %v", eventID, body)
		if athleteID == "" {
			athleteID, competitorID = id, createdID(t, body)
		}
		assert.Equal(t, athleteID, id, "event %s linked to a different athlete", eventID)
		assert.Equal(t, memberNumber, body["memberNumber"])
	}

	t.Run("only signed-in readers see the member number", func(t *testing.T) {
		route := "/api/v1/competitors/" + competitorID
		assert.Equal(t, memberNumber, send(t, app, testkit.GET, route, nil, http.StatusOK)["memberNumber"])

		anonymous := testkit.New(t).
			Request(testkit.Request{App: app, Route: route, Method: testkit.GET}).
			AssertStatus(http.StatusOK).
			GetBody()
		assert.Contains(t, anonymous, "memberNumber")
		assert.Nil(t, anonymous["memberNumber"])
	})

	similarID := createAthleteCompetitor(t, app, openEpeeEventID, randomMemberNumber(), "Vanderquest")["athleteId"]

	tests := []struct {
		name   string
		route  string
		status int
		check  func(t *testing.T, body map[string]any)
	}{
		{
			name: "profile shows the name and is unclaimed", route: "/api/v1/athletes/" + athleteID, status: http.StatusOK,
			check: func(t *testing.T, body map[string]any) {
				assert.Equal(t, "Ottoline", body["firstName"])
				assert.Equal(t, "Vanderquist", body["lastName"])
				assert.Equal(t, false, body["claimed"])
			},
		},
		{
			name: "history lists only the public ended tournament", route: "/api/v1/athletes/" + athleteID + "/competitors", status: http.StatusOK,
			check: func(t *testing.T, body map[string]any) {
				assert.EqualValues(t, 1, body["total"])
				data := body["data"].([]any)
				require.Len(t, data, 1)
				assert.Equal(t, summerInvitational2026, data[0].(map[string]any)["tournamentId"])
			},
		},
		{
			name: "search tolerates a misspelled name", route: "/api/v1/athletes?q=Otoline%20Vanderqist", status: http.StatusOK,
			check: func(t *testing.T, body map[string]any) {
				var ids []any
				for _, row := range body["data"].([]any) {
					ids = append(ids, row.(map[string]any)["id"])
				}
				assert.Contains(t, ids, athleteID)
			},
		},
		{
			name: "search ranks the exact name first", route: "/api/v1/athletes?q=Ottoline%20Vanderquist", status: http.StatusOK,
			check: func(t *testing.T, body map[string]any) {
				data := body["data"].([]any)
				require.Len(t, data, 2)
				assert.Equal(t, athleteID, data[0].(map[string]any)["id"])
				assert.Equal(t, similarID, data[1].(map[string]any)["id"])
			},
		},
		{
			name: "unknown athlete is not found", route: "/api/v1/athletes/" + uuid.NewString(), status: http.StatusNotFound,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := send(t, app, testkit.GET, tt.route, nil, tt.status)
			if tt.check != nil {
				tt.check(t, body)
			}
		})
	}
}

func TestCompetitorMemberNumberUnlinking(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	created := createAthleteCompetitor(t, app, mixedEpeeEventID, randomMemberNumber(), "Vanderquist")
	route := "/api/v1/competitors/" + createdID(t, created)

	t.Run("an empty member number clears the athlete link", func(t *testing.T) {
		body := send(t, app, testkit.PATCH, route, map[string]any{"memberNumber": ""}, http.StatusOK)
		assert.Nil(t, body["athleteId"])
	})

	t.Run("a malformed member number is rejected", func(t *testing.T) {
		send(t, app, testkit.PATCH, route, map[string]any{"memberNumber": "12345"}, http.StatusBadRequest)
	})
}
