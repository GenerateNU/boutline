package test

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

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

type poolStageFixture struct {
	eventID uuid.UUID
	repo    *FakeEventResultRepository
	fencers map[string]uuid.UUID
}

func newPoolStageFixture() poolStageFixture {
	return poolStageFixture{
		eventID: uuid.New(),
		fencers: map[string]uuid.UUID{},
		repo: &FakeEventResultRepository{
			PoolStages:   map[uuid.UUID]eventresult.EventResultPoolStageRow{},
			Eliminations: map[uuid.UUID]eventresult.EventResultDirectEliminationRow{},
			PoolBouts:    map[uuid.UUID][]pool.PoolSheetBoutRow{},
			PoolFencers:  map[uuid.UUID][]eventresult.PoolStageResultFencer{},
			Entrants:     map[uuid.UUID][]directelimination.DirectEliminationEntrant{},
		},
	}
}

// withPoolStage seats A, B and C in pool 1 and D and E in pool 2 of a stage that
// is still running. Across the stage they rank A, D, C, B, E; pool 2's active bout
// must not count.
func (f poolStageFixture) withPoolStage() poolStageFixture {
	stageID := uuid.New()
	f.repo.PoolStages[f.eventID] = eventresult.EventResultPoolStageRow{ID: stageID, Status: poolstage.PoolStageStatusActive}

	club := "Salle Rouge"
	for _, seat := range []struct {
		name string
		pool int
	}{{"A", 1}, {"B", 1}, {"C", 1}, {"D", 2}, {"E", 2}} {
		id := uuid.New()
		f.fencers[seat.name] = id
		fencer := eventresult.PoolStageResultFencer{
			CompetitorID: id, FirstName: "F" + seat.name, LastName: "L" + seat.name, PoolNumber: seat.pool,
		}
		if seat.name == "D" {
			fencer.Club = &club
		}
		f.repo.PoolFencers[stageID] = append(f.repo.PoolFencers[stageID], fencer)
	}

	bout := func(status, a string, sa int, b string, sb int) pool.PoolSheetBoutRow {
		return pool.PoolSheetBoutRow{
			Status: status, Competitor1ID: f.fencers[a], Competitor1Score: sa, Competitor2ID: f.fencers[b], Competitor2Score: sb,
		}
	}
	f.repo.PoolBouts[stageID] = []pool.PoolSheetBoutRow{
		bout("ended", "A", 5, "B", 2), bout("ended", "A", 5, "C", 3), bout("ended", "C", 5, "B", 4),
		bout("ended", "D", 5, "E", 1), bout("active", "E", 4, "D", 0),
	}

	return f
}

// withTableau adds the event's direct elimination; with no names it is not drawn yet.
func (f poolStageFixture) withTableau(names ...string) poolStageFixture {
	deID := uuid.New()
	f.repo.Eliminations[f.eventID] = eventresult.EventResultDirectEliminationRow{
		ID: deID, Status: directelimination.DirectEliminationStatusUpcoming,
	}
	for i, name := range names {
		f.repo.Entrants[deID] = append(f.repo.Entrants[deID], directelimination.DirectEliminationEntrant{
			CompetitorID: f.fencers[name], Seed: i + 1,
		})
	}

	return f
}

func (f poolStageFixture) get(t *testing.T, path string) *httptest.ResponseRecorder {
	t.Helper()

	_, api := humatest.New(t)
	events := &FakeEventLookup{Events: map[uuid.UUID]event.Event{f.eventID: {ID: f.eventID}}}
	eventresult.RegisterPoolStageResultService(api, eventresult.NewPoolStageResultService(f.repo, events))

	return api.Get(path)
}

func (f poolStageFixture) path(query string) string {
	return "/api/v1/events/" + f.eventID.String() + "/pool-stage-results" + query
}

type poolStageResultsBody struct {
	Data []struct {
		Place    int    `json:"place"`
		LastName string `json:"last_name"`
		Status   string `json:"status"`
	} `json:"data"`
	Total int `json:"total"`
}

func (b poolStageResultsBody) summary() []string {
	out := make([]string, len(b.Data))
	for i, row := range b.Data {
		out[i] = fmt.Sprintf("%d %s %s", row.Place, row.LastName, row.Status)
	}

	return out
}

func TestPoolStageResultsEndpoint(t *testing.T) {
	t.Parallel()

	pending := []string{"1 LA pending", "2 LD pending", "3 LC pending", "4 LB pending", "5 LE pending"}

	tests := []struct {
		name      string
		fx        poolStageFixture
		query     string
		want      []string
		wantTotal int
	}{
		{name: "event with no pool stage is empty", fx: newPoolStageFixture(), want: []string{}},
		{
			name: "ranks every pool of a running stage together", fx: newPoolStageFixture().withPoolStage(),
			want: pending, wantTotal: 5,
		},
		{
			name: "an undrawn tableau leaves everyone pending", fx: newPoolStageFixture().withPoolStage().withTableau(),
			want: pending, wantTotal: 5,
		},
		{
			name: "a drawn tableau splits advanced from eliminated", fx: newPoolStageFixture().withPoolStage().withTableau("A", "D", "C"),
			want:      []string{"1 LA advanced", "2 LD advanced", "3 LC advanced", "4 LB eliminated", "5 LE eliminated"},
			wantTotal: 5,
		},
		{
			name: "a page is a slice of the ranked rows", fx: newPoolStageFixture().withPoolStage(),
			query: "?limit=2&offset=1", want: []string{"2 LD pending", "3 LC pending"}, wantTotal: 5,
		},
		{
			name: "offset past the end is empty with the total", fx: newPoolStageFixture().withPoolStage(),
			query: "?offset=50", want: []string{}, wantTotal: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := tt.fx.get(t, tt.fx.path(tt.query))
			require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

			var body poolStageResultsBody
			require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
			assert.Equal(t, tt.want, body.summary())
			assert.Equal(t, tt.wantTotal, body.Total)
			assert.Contains(t, resp.Body.String(), `"data":[`)
		})
	}
}

func TestPoolStageResultsEndpointShape(t *testing.T) {
	t.Parallel()

	fx := newPoolStageFixture().withPoolStage()

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

	failing := newPoolStageFixture()
	failing.repo.Err = errors.New("connection refused")

	tests := []struct {
		name       string
		fx         poolStageFixture
		id         string
		wantStatus int
	}{
		{name: "malformed id is rejected", fx: newPoolStageFixture(), id: "nope", wantStatus: http.StatusUnprocessableEntity},
		{name: "unknown event is 404", fx: newPoolStageFixture(), id: uuid.NewString(), wantStatus: http.StatusNotFound},
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
