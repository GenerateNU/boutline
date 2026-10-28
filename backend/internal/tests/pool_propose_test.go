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
// entrant query and the tournament check run against Postgres. Nothing is saved.
func TestProposePoolsAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	headers := map[string]string{"Authorization": "Bearer " + poolCreateToken(t, app)}
	route := "/api/v1/pool-stages/" + poolCreateStageID + "/proposed-pools"

	// Fall Open's competitors: Maya, Liam, Hana, Noah, Amara, Ethan and six of the later entries.
	entered := []int{1, 2, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22}

	t.Run("splits the field into balanced pools without saving them", func(t *testing.T) {
		before := poolCreateStageTotal(t, app, headers)
		ids := make([]string, 0, len(entered))
		for _, n := range entered {
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
		name   string
		other  int
		detail string
	}{
		{name: "a competitor in no tournament", other: 3, detail: "is not entered in this pool stage's tournament"},
		{name: "a competitor from another tournament", other: 9, detail: "is not entered in this pool stage's tournament"},
	}
	for _, tt := range rejects {
		t.Run(tt.name, func(t *testing.T) {
			result := testkit.New(t).
				Request(testkit.Request{App: app, Route: route, Method: testkit.POST, Headers: headers,
					Body: map[string]any{"competitor_ids": []string{poolCreateCompetitorID(1), poolCreateCompetitorID(tt.other)}}}).
				AssertStatus(http.StatusBadRequest)
			assert.Contains(t, result.GetBody()["detail"], tt.detail)
		})
	}
}
