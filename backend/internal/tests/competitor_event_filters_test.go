package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Exercises the weapon/age_category competitor filters against seeds/seed.sql
// over a real Postgres connection. ListCompetitors filters these with a
// semi-join subquery against events rather than a Joins (repository.go), since
// competitors and events both have a gender column and a join would make the
// existing gender/id clauses ambiguous. The fake-backed suites can't catch an
// ambiguous-column or malformed-subquery mistake here -- only real SQL can.
// Skipped unless a real database is reachable -- see testkit.GetDBTestApp.
const (
	winterClassic2026 = "b0000000-0000-4000-8000-000000000002"
)

func TestCompetitorEventFiltersAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	tests := []struct {
		name         string
		tournamentID string
		query        map[string]string
		wantStatus   int
		wantTotal    int64
	}{
		{
			// Mixed Épée (epee/senior): 24 seeded competitors.
			name:         "weapon epee returns only Mixed Epee competitors",
			tournamentID: fallOpen2026,
			query:        map[string]string{"weapon": "epee"},
			wantStatus:   http.StatusOK,
			wantTotal:    24,
		},
		{
			// Women's Foil (foil/junior): 12 seeded competitors, a distinct
			// non-empty set from weapon=epee above.
			name:         "weapon foil returns only Womens Foil competitors",
			tournamentID: fallOpen2026,
			query:        map[string]string{"weapon": "foil"},
			wantStatus:   http.StatusOK,
			wantTotal:    12,
		},
		{
			// senior is Mixed Epee's only age category in this tournament, so
			// this narrows identically to weapon=epee.
			name:         "ageCategory senior narrows the same way as weapon epee",
			tournamentID: fallOpen2026,
			query:        map[string]string{"ageCategory": "senior"},
			wantStatus:   http.StatusOK,
			wantTotal:    24,
		},
		{
			// epee is only Mixed Epee (senior) and junior is only Women's Foil
			// (foil) in this tournament, so no event satisfies both -- this
			// is the case that would catch an OR/AND mistake in the subquery.
			name:         "contradictory weapon and ageCategory return zero rows",
			tournamentID: fallOpen2026,
			query:        map[string]string{"weapon": "epee", "ageCategory": "junior"},
			wantStatus:   http.StatusOK,
			wantTotal:    0,
		},
		{
			// Open Sabre (sabre/open) in Winter Classic: 4 seeded competitors.
			name:         "weapon sabre scoped to a different tournament",
			tournamentID: winterClassic2026,
			query:        map[string]string{"weapon": "sabre"},
			wantStatus:   http.StatusOK,
			wantTotal:    4,
		},
		{
			// Of Mixed Epee's 24 competitors, 12 are gender F. This is the
			// case that would catch a gender ambiguity between competitors
			// and events if the subquery were a join instead.
			name:         "weapon epee composes with an existing gender filter",
			tournamentID: fallOpen2026,
			query:        map[string]string{"weapon": "epee", "gender": "F"},
			wantStatus:   http.StatusOK,
			wantTotal:    12,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			query := map[string]string{"tournament_id": tt.tournamentID, "limit": "100"}
			for k, v := range tt.query {
				query[k] = v
			}

			body := testkit.New(t).
				Request(testkit.Request{
					App:     app,
					Route:   "/api/v1/competitors",
					Method:  testkit.GET,
					Query:   query,
					Headers: authHeaders(t, searchTestUserID),
				}).
				AssertStatus(tt.wantStatus).
				GetBody()

			total, ok := body["total"].(float64)
			require.True(t, ok, "total field is not a number")
			assert.Equal(t, tt.wantTotal, int64(total))

			rows, ok := body["data"].([]any)
			require.True(t, ok, "data field is not an array")
			assert.Len(t, rows, int(tt.wantTotal))
		})
	}
}
