package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListTournamentUsersAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	tests := []struct {
		name          string
		query         map[string]string
		wantTotal     float64
		wantLastNames []string
	}{
		{
			name:          "role referee lists only the referees",
			query:         map[string]string{"role": "referee"},
			wantTotal:     2,
			wantLastNames: []string{"Lee", "Rivera"},
		},
		{
			name:          "a misspelled name still matches",
			query:         map[string]string{"role": "referee", "q": "Jordam"},
			wantLastNames: []string{"Lee"},
		},
		{
			name:          "no filters lists admins and referees",
			query:         map[string]string{},
			wantTotal:     4,
			wantLastNames: []string{"Morgan", "Kim", "Lee", "Rivera"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.query["limit"] = "100"
			body := testkit.New(t).
				Request(testkit.Request{
					App:     app,
					Route:   "/api/v1/tournaments/" + fallOpen2026 + "/users",
					Method:  testkit.GET,
					Query:   tt.query,
					Headers: authHeaders(t, searchTestUserID),
				}).
				AssertStatus(http.StatusOK).
				GetBody()

			rows, ok := body["data"].([]any)
			require.True(t, ok, "data field is not an array")

			lastNames := make([]string, 0, len(rows))
			for _, raw := range rows {
				row, ok := raw.(map[string]any)
				require.True(t, ok)
				assert.NotEmpty(t, row["first_name"])
				assert.NotContains(t, row, "email")
				lastNames = append(lastNames, row["last_name"].(string))
			}

			assert.Subset(t, lastNames, tt.wantLastNames)
			if tt.wantTotal != 0 {
				assert.Equal(t, tt.wantTotal, body["total"])
				assert.Len(t, lastNames, len(tt.wantLastNames))
			}
		})
	}
}

// The seed has Jordan Lee running Fall Open's Pools 1 and 2, both started, with an
// active bout. Other tests add pools for Sam Rivera, so only Lee's row is stable.
func TestListTournamentUsersShowsWhatARefereeIsRunning(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	body := testkit.New(t).
		Request(testkit.Request{
			App:     app,
			Route:   "/api/v1/tournaments/" + fallOpen2026 + "/users",
			Method:  testkit.GET,
			Query:   map[string]string{"role": "referee", "q": "Jordan Lee"},
			Headers: authHeaders(t, searchTestUserID),
		}).
		AssertStatus(http.StatusOK).
		GetBody()

	rows, ok := body["data"].([]any)
	require.True(t, ok, "data field is not an array")
	require.NotEmpty(t, rows)
	lee, ok := rows[0].(map[string]any)
	require.True(t, ok)

	assert.Equal(t, "Lee", lee["last_name"])
	assert.Equal(t, true, lee["occupied"])
	assert.Equal(t, float64(1), lee["pool_number"])
}
