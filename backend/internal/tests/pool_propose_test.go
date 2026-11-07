package tests

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/poolstage"
	"boutline/internal/tests/testkit"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Proposes pools for the seeded upcoming Women's Foil stage from real competitors, so the
// entrant query and the event check run against Postgres. Nothing is saved.
func TestProposePoolsAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	headers := map[string]string{"Authorization": "Bearer " + poolCreateToken(t, app)}
	route := "/api/v1/pool-stages/" + poolCreateStageID + "/proposed-pools"

	t.Run("splits the field into balanced pools without saving them", func(t *testing.T) {
		before := poolCreateStageTotal(t, app, headers)
		ids := make([]string, 0, 12)
		for n := 1; n <= 12; n++ {
			ids = append(ids, poolCreateCompetitorID(n))
		}

		result := testkit.New(t).
			Request(testkit.Request{App: app, Route: route, Method: testkit.POST, Headers: headers,
				Body: map[string]any{"competitor_ids": ids}}).
			AssertStatus(http.StatusOK)

		raw, err := json.Marshal(result.GetBody())
		require.NoError(t, err)
		var body poolstage.PoolStageProposalResult
		require.NoError(t, json.Unmarshal(raw, &body))
		require.Len(t, body.Pools, 2, "twelve fencers in a stage of at most six make two pools")

		proposed := []string{}
		for _, pool := range body.Pools {
			assert.Len(t, pool.Fencers, 6)
			for _, fencer := range pool.Fencers {
				proposed = append(proposed, fencer.CompetitorID)
				assert.NotEmpty(t, fencer.FirstName)
			}
		}
		assert.ElementsMatch(t, ids, proposed)
		assert.Equal(t, before, poolCreateStageTotal(t, app, headers), "a proposal saves no pools")
	})

	rejects := []struct {
		name  string
		other string
	}{
		// Maya is entered in Mixed Épée, the same tournament's other event.
		{name: "a competitor from another event of the tournament", other: "d0000000-0000-4000-8000-000000000001"},
		// Sofia Rossi is entered in another tournament.
		{name: "a competitor from another tournament", other: "d0000000-0000-4000-8000-000000000009"},
	}
	for _, tt := range rejects {
		t.Run(tt.name, func(t *testing.T) {
			result := testkit.New(t).
				Request(testkit.Request{App: app, Route: route, Method: testkit.POST, Headers: headers,
					Body: map[string]any{"competitor_ids": []string{poolCreateCompetitorID(1), tt.other}}}).
				AssertStatus(http.StatusBadRequest)
			assert.Contains(t, result.GetBody()["detail"], "is not entered in this pool stage's event")
		})
	}
}
