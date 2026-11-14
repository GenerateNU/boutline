package eventresult

import (
	"testing"

	"boutline/internal/features/directelimination"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

type placed struct {
	Place int
	Name  string
	By    EventResultStage
}

type scenario struct {
	ids         map[string]uuid.UUID
	competitors map[uuid.UUID]EventResultCompetitor
}

func newScenario(names ...string) scenario {
	s := scenario{ids: map[string]uuid.UUID{}, competitors: map[uuid.UUID]EventResultCompetitor{}}
	for _, name := range names {
		id := uuid.New()
		s.ids[name] = id
		s.competitors[id] = EventResultCompetitor{ID: id, FirstName: "F", LastName: name}
	}

	return s
}

func (s scenario) poolBout(a string, scoreA int, b string, scoreB int) pool.PoolSheetBoutRow {
	return pool.PoolSheetBoutRow{
		Status: "ended", Competitor1ID: s.ids[a], Competitor1Score: scoreA, Competitor2ID: s.ids[b], Competitor2Score: scoreB,
	}
}

func (s scenario) deBout(roundSize int, a string, scoreA int, b string, scoreB int) directelimination.DirectEliminationBoutScore {
	return directelimination.DirectEliminationBoutScore{
		RoundSize: roundSize, Status: "ended",
		Competitor1ID: s.ids[a], Competitor1Score: scoreA, Competitor2ID: s.ids[b], Competitor2Score: scoreB,
	}
}

// entrants seeds the named fencers 1..n in the order given.
func (s scenario) entrants(names ...string) []directelimination.DirectEliminationEntrant {
	out := make([]directelimination.DirectEliminationEntrant, len(names))
	for i, name := range names {
		out[i] = directelimination.DirectEliminationEntrant{CompetitorID: s.ids[name], Seed: i + 1}
	}

	return out
}

// fourFencerTableau places W 1, X 2, Y and Z 3.
func (s scenario) fourFencerTableau() ([]directelimination.DirectEliminationEntrant, []directelimination.DirectEliminationBoutScore) {
	return s.entrants("W", "X", "Y", "Z"), []directelimination.DirectEliminationBoutScore{
		s.deBout(4, "W", 15, "Z", 3),
		s.deBout(4, "X", 15, "Y", 9),
		s.deBout(2, "W", 15, "X", 12),
	}
}

func projectRows(rows []EventResultRow) []placed {
	out := make([]placed, len(rows))
	for i, r := range rows {
		out[i] = placed{r.Place, r.Competitor.LastName, r.DecidedBy}
	}

	return out
}

func TestAggregateEventResults(t *testing.T) {
	t.Parallel()

	const (
		byPool = EventResultStagePool
		byDE   = EventResultStageDirectElimination
	)

	tests := []struct {
		name  string
		build func(s scenario) eventResultInputs
		names []string
		want  []placed
	}{
		{
			name:  "empty inputs give no rows",
			build: func(scenario) eventResultInputs { return eventResultInputs{} },
			want:  []placed{},
		},
		{
			name:  "pool only ranks every pool together and orders ties by last name",
			names: []string{"A", "B", "C", "D"},
			build: func(s scenario) eventResultInputs {
				return eventResultInputs{poolBouts: []pool.PoolSheetBoutRow{
					s.poolBout("C", 5, "D", 3), s.poolBout("A", 5, "B", 3),
				}}
			},
			want: []placed{{1, "A", byPool}, {1, "C", byPool}, {3, "B", byPool}, {3, "D", byPool}},
		},
		{
			name:  "direct elimination only places the tableau",
			names: []string{"W", "X", "Y", "Z"},
			build: func(s scenario) eventResultInputs {
				entrants, bouts := s.fourFencerTableau()
				return eventResultInputs{entrants: entrants, tableauBouts: bouts}
			},
			want: []placed{{1, "W", byDE}, {2, "X", byDE}, {3, "Y", byDE}, {3, "Z", byDE}},
		},
		{
			name:  "cut fencers continue after the direct elimination places",
			names: []string{"W", "X", "Y", "Z", "E", "F"},
			build: func(s scenario) eventResultInputs {
				entrants, bouts := s.fourFencerTableau()
				return eventResultInputs{
					poolBouts: []pool.PoolSheetBoutRow{s.poolBout("E", 5, "F", 3), s.poolBout("W", 5, "X", 4)},
					entrants:  entrants, tableauBouts: bouts,
				}
			},
			want: []placed{
				{1, "W", byDE}, {2, "X", byDE}, {3, "Y", byDE}, {3, "Z", byDE}, {5, "E", byPool}, {6, "F", byPool},
			},
		},
		{
			name:  "tied cut fencers share a place and the next place is skipped",
			names: []string{"W", "X", "Y", "Z", "E", "F", "G", "H"},
			build: func(s scenario) eventResultInputs {
				entrants, bouts := s.fourFencerTableau()
				return eventResultInputs{
					poolBouts: []pool.PoolSheetBoutRow{s.poolBout("E", 5, "F", 3), s.poolBout("G", 5, "H", 3)},
					entrants:  entrants, tableauBouts: bouts,
				}
			},
			want: []placed{
				{1, "W", byDE}, {2, "X", byDE}, {3, "Y", byDE}, {3, "Z", byDE},
				{5, "E", byPool}, {5, "G", byPool}, {7, "F", byPool}, {7, "H", byPool},
			},
		},
		{
			name:  "a cut fencer ahead of a direct elimination fencer in the pool still places after the tableau",
			names: []string{"W", "X", "Y", "Z", "E", "F"},
			build: func(s scenario) eventResultInputs {
				entrants, bouts := s.fourFencerTableau()
				return eventResultInputs{
					poolBouts: []pool.PoolSheetBoutRow{s.poolBout("E", 5, "Z", 0), s.poolBout("W", 5, "F", 3)},
					entrants:  entrants, tableauBouts: bouts,
				}
			},
			want: []placed{
				{1, "W", byDE}, {2, "X", byDE}, {3, "Y", byDE}, {3, "Z", byDE}, {5, "E", byPool}, {6, "F", byPool},
			},
		},
		{
			name:  "an entrant missing from the pool ranking is still placed",
			names: []string{"W", "X", "Y", "Z", "E", "F"},
			build: func(s scenario) eventResultInputs {
				entrants, bouts := s.fourFencerTableau()
				return eventResultInputs{
					poolBouts: []pool.PoolSheetBoutRow{s.poolBout("E", 5, "F", 3)},
					entrants:  entrants, tableauBouts: bouts,
				}
			},
			want: []placed{
				{1, "W", byDE}, {2, "X", byDE}, {3, "Y", byDE}, {3, "Z", byDE}, {5, "E", byPool}, {6, "F", byPool},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			s := newScenario(tt.names...)
			rows := aggregateEventResults(tt.build(s), s.competitors)

			assert.Equal(t, tt.want, projectRows(rows))
		})
	}
}

func TestEventResultCompetitorIDs(t *testing.T) {
	t.Parallel()

	s := newScenario("A", "B", "C")
	in := eventResultInputs{
		poolBouts: []pool.PoolSheetBoutRow{s.poolBout("A", 5, "B", 3), s.poolBout("B", 5, "A", 3)},
		entrants:  s.entrants("B", "C"),
	}

	assert.Equal(t, []uuid.UUID{s.ids["A"], s.ids["B"], s.ids["C"]}, eventResultCompetitorIDs(in))
}
