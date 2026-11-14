package test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"boutline/internal/features/competitor"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/event"
	"boutline/internal/features/eventresult"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fixture struct {
	eventID uuid.UUID
	repo    *FakeEventResultRepository
	fencers map[string]uuid.UUID
}

// newFixture registers fencers A to E. The pool ranks them C, A, D, B, E; the
// tableau, when ended, is a final that A wins over B.
func newFixture() fixture {
	f := fixture{
		eventID: uuid.New(),
		fencers: map[string]uuid.UUID{},
		repo: &FakeEventResultRepository{
			PoolStages:   map[uuid.UUID]eventresult.EventResultPoolStageRow{},
			Eliminations: map[uuid.UUID]eventresult.EventResultDirectEliminationRow{},
			PoolBouts:    map[uuid.UUID][]pool.PoolSheetBoutRow{},
			Entrants:     map[uuid.UUID][]directelimination.DirectEliminationEntrant{},
			DEBouts:      map[uuid.UUID][]directelimination.DirectEliminationBoutScore{},
			Competitors:  map[uuid.UUID]eventresult.EventResultCompetitor{},
		},
	}
	for _, name := range []string{"A", "B", "C", "D", "E"} {
		id := uuid.New()
		f.fencers[name] = id
		f.repo.Competitors[id] = eventresult.EventResultCompetitor{
			ID: id, FirstName: "F" + name, LastName: "L" + name, Rating: competitor.RatingU,
		}
	}
	club := "Boston Fencing Club"
	a := f.repo.Competitors[f.fencers["A"]]
	a.PrimaryClub, a.Rating = &club, competitor.RatingA
	f.repo.Competitors[a.ID] = a

	return f
}

func (f fixture) withPoolStage(status poolstage.PoolStageStatus) fixture {
	stageID := uuid.New()
	f.repo.PoolStages[f.eventID] = eventresult.EventResultPoolStageRow{ID: stageID, Status: status}
	bout := func(a string, sa int, b string, sb int) pool.PoolSheetBoutRow {
		return pool.PoolSheetBoutRow{
			Status: "ended", Competitor1ID: f.fencers[a], Competitor1Score: sa, Competitor2ID: f.fencers[b], Competitor2Score: sb,
		}
	}
	f.repo.PoolBouts[stageID] = []pool.PoolSheetBoutRow{
		bout("A", 5, "B", 2), bout("C", 5, "D", 4), bout("D", 5, "E", 1), bout("C", 5, "E", 0),
	}

	return f
}

func (f fixture) withDirectElimination(status directelimination.DirectEliminationStatus) fixture {
	deID := uuid.New()
	f.repo.Eliminations[f.eventID] = eventresult.EventResultDirectEliminationRow{ID: deID, Status: status}
	f.repo.Entrants[deID] = []directelimination.DirectEliminationEntrant{
		{CompetitorID: f.fencers["A"], Seed: 1}, {CompetitorID: f.fencers["B"], Seed: 2},
	}
	f.repo.DEBouts[deID] = []directelimination.DirectEliminationBoutScore{{
		RoundSize: 2, Status: "ended",
		Competitor1ID: f.fencers["A"], Competitor1Score: 15, Competitor2ID: f.fencers["B"], Competitor2Score: 9,
	}}

	return f
}

func (f fixture) get(t *testing.T, path string) *httptest.ResponseRecorder {
	t.Helper()

	_, api := humatest.New(t)
	events := &FakeEventLookup{Events: map[uuid.UUID]event.Event{f.eventID: {ID: f.eventID}}}
	eventresult.RegisterEventResultService(api, eventresult.NewEventResultService(f.repo, events))

	return api.Get(path)
}

type resultsBody struct {
	Data []struct {
		Place     int    `json:"place"`
		LastName  string `json:"last_name"`
		DecidedBy string `json:"decided_by"`
	} `json:"data"`
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

func (b resultsBody) summary() []string {
	out := make([]string, len(b.Data))
	for i, row := range b.Data {
		out[i] = row.LastName
	}

	return out
}

func TestEventResultsEndpoint(t *testing.T) {
	t.Parallel()

	const (
		ended    = poolstage.PoolStageStatusEnded
		deEnded  = directelimination.DirectEliminationStatusEnded
		deUpcome = directelimination.DirectEliminationStatusUpcoming
	)

	tests := []struct {
		name      string
		fx        fixture
		query     string
		wantNames []string
		wantTotal int
	}{
		{name: "event with no stages is empty", fx: newFixture(), wantNames: []string{}},
		{
			name: "active pool stage and upcoming tableau are empty",
			fx:   newFixture().withPoolStage(poolstage.PoolStageStatusActive).withDirectElimination(deUpcome), wantNames: []string{},
		},
		{
			name: "ended pool stage ranks everyone by the pool", fx: newFixture().withPoolStage(ended),
			wantNames: []string{"LC", "LA", "LD", "LB", "LE"}, wantTotal: 5,
		},
		{
			name: "ended tableau places only its entrants", fx: newFixture().withDirectElimination(deEnded),
			wantNames: []string{"LA", "LB"}, wantTotal: 2,
		},
		{
			name: "both stages list the tableau then the cut", fx: newFixture().withPoolStage(ended).withDirectElimination(deEnded),
			wantNames: []string{"LA", "LB", "LC", "LD", "LE"}, wantTotal: 5,
		},
		{
			name:      "pool stage ended with a tableau still upcoming ranks by the pool",
			fx:        newFixture().withPoolStage(ended).withDirectElimination(deUpcome),
			wantNames: []string{"LC", "LA", "LD", "LB", "LE"}, wantTotal: 5,
		},
		{
			name: "a page is a slice of the ordered rows", fx: newFixture().withPoolStage(ended).withDirectElimination(deEnded),
			query: "?limit=2&offset=1", wantNames: []string{"LB", "LC"}, wantTotal: 5,
		},
		{
			name: "offset past the end is empty with the total", fx: newFixture().withPoolStage(ended).withDirectElimination(deEnded),
			query: "?offset=50", wantNames: []string{}, wantTotal: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := tt.fx.get(t, "/api/v1/events/"+tt.fx.eventID.String()+"/results"+tt.query)
			require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

			var body resultsBody
			require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
			assert.Equal(t, tt.wantNames, body.summary())
			assert.Equal(t, tt.wantTotal, body.Total)
			assert.Contains(t, resp.Body.String(), `"data":[`)
		})
	}
}

func TestEventResultsEndpointShape(t *testing.T) {
	t.Parallel()

	fx := newFixture().withPoolStage(poolstage.PoolStageStatusEnded).withDirectElimination(directelimination.DirectEliminationStatusEnded)
	path := "/api/v1/events/" + fx.eventID.String() + "/results"

	t.Run("a row uses the snake_case wire format with a null club", func(t *testing.T) {
		t.Parallel()

		resp := fx.get(t, path+"?limit=1&offset=1")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		var body struct {
			Data   []json.RawMessage `json:"data"`
			Total  int               `json:"total"`
			Limit  int               `json:"limit"`
			Offset int               `json:"offset"`
		}
		require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
		require.Len(t, body.Data, 1)
		assert.Equal(t, 5, body.Total)
		assert.Equal(t, 1, body.Limit)
		assert.Equal(t, 1, body.Offset)
		assert.JSONEq(t, `{
			"place": 2, "competitor_id": "`+fx.fencers["B"].String()+`", "first_name": "FB", "last_name": "LB",
			"club": null, "rating": "U", "decided_by": "direct_elimination"
		}`, string(body.Data[0]))
	})

	t.Run("a club is returned when the fencer has one", func(t *testing.T) {
		t.Parallel()

		resp := fx.get(t, path+"?limit=1")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		var body struct {
			Data []struct {
				Club   string `json:"club"`
				Rating string `json:"rating"`
			} `json:"data"`
		}
		require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
		require.Len(t, body.Data, 1)
		assert.Equal(t, "Boston Fencing Club", body.Data[0].Club)
		assert.Equal(t, "A", body.Data[0].Rating)
	})
}

func TestEventResultsEndpointErrors(t *testing.T) {
	t.Parallel()

	failing := newFixture()
	failing.repo.Err = errors.New("connection refused")

	tests := []struct {
		name       string
		fx         fixture
		id         string
		wantStatus int
	}{
		{name: "malformed id is rejected", fx: newFixture(), id: "nope", wantStatus: http.StatusUnprocessableEntity},
		{name: "unknown event is 404", fx: newFixture(), id: uuid.NewString(), wantStatus: http.StatusNotFound},
		{name: "repository failure is 500", fx: failing, wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			id := tt.id
			if id == "" {
				id = tt.fx.eventID.String()
			}
			resp := tt.fx.get(t, "/api/v1/events/"+id+"/results")

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
			assert.NotContains(t, resp.Body.String(), "connection refused")
		})
	}
}
