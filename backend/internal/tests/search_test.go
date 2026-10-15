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
			name:        "users list tolerates a typo in q",
			route:       "/api/v1/users",
			query:       map[string]string{"q": "Jordam Lee"}, // seeded: Jordan Lee
			wantStatus:  http.StatusOK,
			wantField:   "lastName",
			wantContain: "Lee",
		},
		{
			name:        "competitors list tolerates a typo in q",
			route:       "/api/v1/competitors",
			query:       map[string]string{"q": "Hana Satoo"}, // seeded: Hana Sato
			wantStatus:  http.StatusOK,
			wantField:   "lastName",
			wantContain: "Sato",
		},
		{
			name:        "competitor teams search tolerates a typo",
			route:       "/api/v1/competitors/search/teams",
			query:       map[string]string{"q": "Boston Fencing Clb"}, // seeded: Boston Fencing Club
			wantStatus:  http.StatusOK,
			wantField:   "team",
			wantContain: "Boston Fencing Club",
		},
		{
			name:        "tournaments list tolerates a typo in q",
			route:       "/api/v1/tournaments",
			query:       map[string]string{"q": "Fall Opn 2026"}, // seeded: Fall Open 2026
			wantStatus:  http.StatusOK,
			wantField:   "name",
			wantContain: "Fall Open 2026",
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

// Boston Fencing Club has competitors in both Fall Open 2026 and Summer
// Invitational 2026 (see seeds/seed.sql), so scoping to one tournament must
// shrink the roster count rather than just filtering out other teams.
func TestSearchCompetitorTeamsByTournament(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	const fallOpen2026 = "b0000000-0000-4000-8000-000000000001"

	unscoped := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/competitors/search/teams",
			Method: testkit.GET,
			Query:  map[string]string{"q": "Boston Fencing Club"},
		}).
		AssertStatus(http.StatusOK)
	unscopedCount := bostonCompetitorCount(t, unscoped.GetBody())

	scoped := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/competitors/search/teams",
			Method: testkit.GET,
			Query:  map[string]string{"q": "Boston Fencing Club", "tournament_id": fallOpen2026},
		}).
		AssertStatus(http.StatusOK)
	scopedCount := bostonCompetitorCount(t, scoped.GetBody())

	assert.Less(t, scopedCount, unscopedCount,
		"scoping to one tournament should shrink Boston Fencing Club's roster count")
}

// seeds/seed.sql holds exactly 3 real tournaments plus 22 bare "Pagination
// Fixture" rows (25 total), so the default page size of 20 always leaves a
// second page to exercise here.
func TestTournamentListPagination(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	firstPage := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/tournaments",
			Method: testkit.GET,
			Query:  map[string]string{"limit": "20", "offset": "0"},
		}).
		AssertStatus(http.StatusOK).
		GetBody()

	total, ok := firstPage["total"].(float64)
	require.True(t, ok, "total field is not a number")
	require.GreaterOrEqual(t, total, float64(25), "expected at least the 25 seeded tournaments")

	firstRows, ok := firstPage["data"].([]any)
	require.True(t, ok, "data field is not an array")
	require.Len(t, firstRows, 20, "first page should be full")

	secondPage := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/tournaments",
			Method: testkit.GET,
			Query:  map[string]string{"limit": "20", "offset": "20"},
		}).
		AssertStatus(http.StatusOK).
		GetBody()

	secondRows, ok := secondPage["data"].([]any)
	require.True(t, ok, "data field is not an array")
	require.NotEmpty(t, secondRows, "expected a second page of tournaments past offset 20")

	seen := make(map[string]bool, len(firstRows))
	for _, row := range firstRows {
		fields, ok := row.(map[string]any)
		require.True(t, ok)
		seen[fields["id"].(string)] = true
	}
	for _, row := range secondRows {
		fields, ok := row.(map[string]any)
		require.True(t, ok)
		assert.False(t, seen[fields["id"].(string)], "second page repeated a row from the first page: %v", fields)
	}
}

func bostonCompetitorCount(t *testing.T, body map[string]any) int64 {
	t.Helper()
	rows, ok := body["data"].([]any)
	require.True(t, ok, "data field is not an array")
	for _, row := range rows {
		fields, ok := row.(map[string]any)
		require.True(t, ok)
		if fields["team"] == "Boston Fencing Club" {
			count, ok := fields["competitorCount"].(float64)
			require.True(t, ok)
			return int64(count)
		}
	}
	t.Fatalf("Boston Fencing Club not found in %v", rows)
	return 0
}
