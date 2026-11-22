package test

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"boutline/internal/features/event"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstageresult"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fixture struct {
	eventID uuid.UUID
	repo    *FakePoolStageResultRepository
	fencers map[string]uuid.UUID
}

func newFixture() fixture {
	return fixture{
		eventID: uuid.New(),
		fencers: map[string]uuid.UUID{},
		repo: &FakePoolStageResultRepository{
			PoolStages: map[uuid.UUID]uuid.UUID{},
			Fencers:    map[uuid.UUID][]poolstageresult.PoolStageResultFencer{},
			Bouts:      map[uuid.UUID][]pool.PoolSheetBoutRow{},
			Entrants:   map[uuid.UUID][]uuid.UUID{},
		},
	}
}

// withPoolStage seats A, B and C in pool 1 and D and E in pool 2. Across the
// stage they rank A, D, C, B, E; pool 2's active bout must not count.
func (f fixture) withPoolStage() fixture {
	stageID := uuid.New()
	f.repo.PoolStages[f.eventID] = stageID

	bladeClub, salleClub := "Boston Blade", "Salle Rouge"
	clubs := map[string]*string{"A": &bladeClub, "D": &salleClub}
	for _, seat := range []struct {
		name string
		pool int
	}{{"A", 1}, {"B", 1}, {"C", 1}, {"D", 2}, {"E", 2}} {
		id := uuid.New()
		f.fencers[seat.name] = id
		f.repo.Fencers[stageID] = append(f.repo.Fencers[stageID], poolstageresult.PoolStageResultFencer{
			CompetitorID: id, FirstName: "F" + seat.name, LastName: "L" + seat.name,
			Club: clubs[seat.name], PoolNumber: seat.pool,
		})
	}

	bout := func(status, a string, sa int, b string, sb int) pool.PoolSheetBoutRow {
		return pool.PoolSheetBoutRow{
			Status: status, Competitor1ID: f.fencers[a], Competitor1Score: sa, Competitor2ID: f.fencers[b], Competitor2Score: sb,
		}
	}
	f.repo.Bouts[stageID] = []pool.PoolSheetBoutRow{
		bout("ended", "A", 5, "B", 2), bout("ended", "A", 5, "C", 3), bout("ended", "C", 5, "B", 4),
		bout("ended", "D", 5, "E", 1), bout("active", "E", 4, "D", 0),
	}

	return f
}

func (f fixture) withTableau(names ...string) fixture {
	for _, name := range names {
		f.repo.Entrants[f.eventID] = append(f.repo.Entrants[f.eventID], f.fencers[name])
	}

	return f
}

func (f fixture) get(t *testing.T, path string) *httptest.ResponseRecorder {
	t.Helper()

	_, api := humatest.New(t)
	events := &FakeEventLookup{Events: map[uuid.UUID]event.Event{f.eventID: {ID: f.eventID}}}
	poolstageresult.RegisterPoolStageResultService(api, poolstageresult.NewPoolStageResultService(f.repo, events))

	return api.Get(path)
}

func (f fixture) path(query string) string {
	return "/api/v1/events/" + f.eventID.String() + "/pool-stage-results" + query
}

type resultsBody struct {
	Data []struct {
		Place    int    `json:"place"`
		LastName string `json:"last_name"`
		Status   string `json:"status"`
	} `json:"data"`
	Total int `json:"total"`
}

func (b resultsBody) summary() []string {
	out := make([]string, len(b.Data))
	for i, row := range b.Data {
		out[i] = fmt.Sprintf("%d %s %s", row.Place, row.LastName, row.Status)
	}

	return out
}

func TestPoolStageResultsEndpoint(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		fx        fixture
		query     string
		want      []string
		wantTotal int
	}{
		{name: "event with no pool stage is empty", fx: newFixture(), want: []string{}},
		{
			name: "ranks every pool together and is pending before the draw", fx: newFixture().withPoolStage(),
			want:      []string{"1 LA pending", "2 LD pending", "3 LC pending", "4 LB pending", "5 LE pending"},
			wantTotal: 5,
		},
		{
			name: "a drawn tableau splits advanced from eliminated", fx: newFixture().withPoolStage().withTableau("A", "D", "C"),
			want:      []string{"1 LA advanced", "2 LD advanced", "3 LC advanced", "4 LB eliminated", "5 LE eliminated"},
			wantTotal: 5,
		},
		{
			name: "a page is a slice of the ranked rows", fx: newFixture().withPoolStage(),
			query: "?limit=2&offset=1", want: []string{"2 LD pending", "3 LC pending"}, wantTotal: 5,
		},
		{
			name: "offset past the end is empty with the total", fx: newFixture().withPoolStage(),
			query: "?offset=50", want: []string{}, wantTotal: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := tt.fx.get(t, tt.fx.path(tt.query))
			require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

			var body resultsBody
			require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
			assert.Equal(t, tt.want, body.summary())
			assert.Equal(t, tt.wantTotal, body.Total)
			assert.Contains(t, resp.Body.String(), `"data":[`)
		})
	}
}

func TestPoolStageResultsEndpointShape(t *testing.T) {
	t.Parallel()

	fx := newFixture().withPoolStage()

	tests := []struct {
		name  string
		query string
		want  string
	}{
		{
			name:  "a row carries the stage-wide standing, club and pool",
			query: "?limit=1&offset=1",
			want: `{
				"place": 2, "victories": 1, "matches": 1, "victory_ratio": 1,
				"touches_scored": 5, "touches_received": 1, "indicator": 4,
				"competitor_id": "` + fx.fencers["D"].String() + `", "first_name": "FD", "last_name": "LD",
				"club": "Salle Rouge", "pool_number": 2, "status": "pending"
			}`,
		},
		{
			name:  "a fencer without a club has a null club",
			query: "?limit=1&offset=2",
			want: `{
				"place": 3, "victories": 1, "matches": 2, "victory_ratio": 0.5,
				"touches_scored": 8, "touches_received": 9, "indicator": -1,
				"competitor_id": "` + fx.fencers["C"].String() + `", "first_name": "FC", "last_name": "LC",
				"club": null, "pool_number": 1, "status": "pending"
			}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := fx.get(t, fx.path(tt.query))
			require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

			var body struct {
				Data []json.RawMessage `json:"data"`
			}
			require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
			require.Len(t, body.Data, 1)
			assert.JSONEq(t, tt.want, string(body.Data[0]))
		})
	}
}

func TestPoolStageResultsEndpointErrors(t *testing.T) {
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
			resp := tt.fx.get(t, "/api/v1/events/"+id+"/pool-stage-results")

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
			assert.NotContains(t, resp.Body.String(), "connection refused")
		})
	}
}
