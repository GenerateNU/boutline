package tests

import (
	"net/http"
	"testing"
	"time"

	"boutline/internal/tests/testkit"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTournamentListFiltersAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	// Windows are built around the seeded rows' stored start times, not
	// time.Now(): re-seeding skips existing rows, so their now()-relative
	// times age while the gaps between them (-3h, +30d, -90d) stay fixed.
	fallStart := seededStartTime(t, app, fallOpen2026)
	summerStart := seededStartTime(t, app, summerInvitational2026)
	stamp := func(at time.Time) string { return at.Format(time.RFC3339Nano) }
	summerBound := summerStart.Add(time.Hour)

	tests := []struct {
		name        string
		query       map[string]string
		wantNames   []string
		absentNames []string
		check       func(t *testing.T, row map[string]any)
	}{
		{
			name:        "start range returns only tournaments starting inside it",
			query:       map[string]string{"start_from": stamp(fallStart.Add(-time.Hour)), "start_to": stamp(fallStart.Add(time.Hour))},
			wantNames:   []string{"Fall Open 2026"},
			absentNames: []string{"Winter Classic 2026", "Summer Invitational 2026"},
		},
		{
			name:        "upper bound alone excludes rows without a start time",
			query:       map[string]string{"start_to": stamp(summerBound)},
			wantNames:   []string{"Summer Invitational 2026"},
			absentNames: []string{"Fall Open 2026", "Winter Classic 2026"},
			check: func(t *testing.T, row map[string]any) {
				start, ok := row["start_time"].(string)
				require.True(t, ok, "row has no start_time: %v", row)
				parsed, err := time.Parse(time.RFC3339Nano, start)
				require.NoError(t, err)
				assert.True(t, parsed.Before(summerBound), "start_time %s outside range", start)
			},
		},
		{
			name:        "visibility public hides private tournaments",
			query:       map[string]string{"visibility": "public"},
			wantNames:   []string{"Fall Open 2026", "Summer Invitational 2026"},
			absentNames: []string{"Winter Classic 2026"},
			check: func(t *testing.T, row map[string]any) {
				assert.Equal(t, "public", row["visibility"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.query["limit"] = "100"
			result := testkit.New(t).
				Request(testkit.Request{
					App:     app,
					Route:   "/api/v1/tournaments",
					Method:  testkit.GET,
					Query:   tt.query,
					Headers: authHeaders(t, searchTestUserID),
				}).
				AssertStatus(http.StatusOK)

			rows, ok := result.GetBody()["data"].([]any)
			require.True(t, ok, "data field is not an array")

			names := map[string]bool{}
			for _, raw := range rows {
				row, ok := raw.(map[string]any)
				require.True(t, ok)
				names[row["name"].(string)] = true
				if tt.check != nil {
					tt.check(t, row)
				}
			}
			for _, name := range tt.wantNames {
				assert.True(t, names[name], "expected %q in %v", name, names)
			}
			for _, name := range tt.absentNames {
				assert.False(t, names[name], "did not expect %q in %v", name, names)
			}
		})
	}
}

func seededStartTime(t *testing.T, app *fiber.App, id string) time.Time {
	t.Helper()
	body := testkit.New(t).
		Request(testkit.Request{
			App:     app,
			Route:   "/api/v1/tournaments/" + id,
			Method:  testkit.GET,
			Headers: authHeaders(t, searchTestUserID),
		}).
		AssertStatus(http.StatusOK).
		GetBody()

	start, ok := body["start_time"].(string)
	require.True(t, ok, "seeded tournament %s has no start_time", id)
	parsed, err := time.Parse(time.RFC3339Nano, start)
	require.NoError(t, err)
	return parsed
}
