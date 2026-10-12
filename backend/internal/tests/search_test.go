package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Exercises the fuzzy search endpoints against seeds/seed.sql's rows over a
// real Postgres connection, so a GIN-index/pg_trgm mistake that a
// strings.Contains fake can't see (wrong operator, wrong indexed expression,
// a query that doesn't actually use the % operator) would show up here.
// Skipped unless a real database is reachable -- see testkit.GetDBTestApp.
func TestSearchAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	tests := []struct {
		name        string
		route       string
		query       map[string]string
		wantStatus  int
		wantField   string // field to look for among the matched rows
		wantContain string // its expected value, when wantStatus is 200
	}{
		{
			name:        "users search tolerates a typo",
			route:       "/api/v1/users/search",
			query:       map[string]string{"q": "Jordam Lee"}, // seeded: Jordan Lee
			wantStatus:  http.StatusOK,
			wantField:   "lastName",
			wantContain: "Lee",
		},
		{
			name:        "competitors search by name tolerates a typo",
			route:       "/api/v1/competitors/search",
			query:       map[string]string{"q": "Hana Satoo"}, // seeded: Hana Sato
			wantStatus:  http.StatusOK,
			wantField:   "lastName",
			wantContain: "Sato",
		},
		{
			name:        "competitors search by team tolerates a typo",
			route:       "/api/v1/competitors/search",
			query:       map[string]string{"q": "Boston Fencing Clb", "by": "team"}, // seeded: Boston Fencing Club
			wantStatus:  http.StatusOK,
			wantField:   "team",
			wantContain: "Boston Fencing Club",
		},
		{
			name:        "tournaments search tolerates a typo",
			route:       "/api/v1/tournaments/search",
			query:       map[string]string{"q": "Fall Opn 2026"}, // seeded: Fall Open 2026
			wantStatus:  http.StatusOK,
			wantField:   "name",
			wantContain: "Fall Open 2026",
		},
		{
			name:       "blank query is rejected",
			route:      "/api/v1/competitors/search",
			query:      map[string]string{"q": "   "},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := testkit.New(t).
				Request(testkit.Request{
					App:    app,
					Route:  tt.route,
					Method: testkit.GET,
					Query:  tt.query,
				}).
				AssertStatus(tt.wantStatus)

			if tt.wantStatus != http.StatusOK {
				return
			}

			rows, ok := result.GetBody()["data"].([]any)
			require.True(t, ok, "data field is not an array")
			require.NotEmpty(t, rows, "expected at least one matching row")

			found := false
			for _, row := range rows {
				fields, ok := row.(map[string]any)
				require.True(t, ok)
				if fields[tt.wantField] == tt.wantContain {
					found = true
					break
				}
			}
			assert.True(t, found, "expected a row with %s = %q, got %v", tt.wantField, tt.wantContain, rows)
		})
	}
}
