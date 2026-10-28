package test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/features/competitor"
	"boutline/internal/features/event"
	"boutline/internal/features/poolstage"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type proposalFixture struct {
	event event.Event
	stage poolstage.PoolStage
	repo  *FakePoolStageRepository
}

// newProposalFixture enters count competitors in the stage's tournament, all on different
// clubs unless clubs says otherwise.
func newProposalFixture(count, maxPerPool int, clubs map[int]string) *proposalFixture {
	f := &proposalFixture{event: seededEvent()}
	f.stage = seededPoolStage(poolstage.PoolStageStatusUpcoming, f.event.ID)
	f.stage.MaxCompetitorPerPool = maxPerPool
	f.repo = NewFakePoolStageRepository(f.stage)

	ratings := []competitor.Rating{"A", "B", "C", "D", "E", "U"}
	for n := 1; n <= count; n++ {
		club, ok := clubs[n]
		if !ok {
			club = fmt.Sprintf("Club %d", n)
		}
		f.enter(n, &f.event.TournamentID, ratings[n%len(ratings)], club)
	}

	return f
}

func (f *proposalFixture) enter(n int, tournamentID *uuid.UUID, rating competitor.Rating, club string) {
	f.repo.Entrants[entrant(n)] = poolstage.PoolStageEntrant{
		ID:           entrant(n),
		TournamentID: tournamentID,
		FirstName:    fmt.Sprintf("Fencer%d", n),
		LastName:     "Test",
		Rating:       rating,
		Team:         club,
	}
}

func (f *proposalFixture) propose(t *testing.T, ids ...string) (*poolstage.PoolStageProposalOutput, error) {
	t.Helper()

	return poolstage.NewPoolStageService(f.repo, NewFakeEventLookup(f.event)).ProposePools(t.Context(),
		&poolstage.PoolStageProposalInput{ID: f.stage.ID.String(), Body: poolstage.PoolStageProposalBody{CompetitorIDs: ids}})
}

func entrant(n int) uuid.UUID { return uuid.UUID{15: byte(n)} }

func entrantIDs(from, to int) []string {
	ids := make([]string, 0, to-from+1)
	for n := from; n <= to; n++ {
		ids = append(ids, entrant(n).String())
	}

	return ids
}

func TestProposePoolsSplitsTheField(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		count      int
		maxPerPool int
		wantSizes  []int
	}{
		{name: "one pool when the field fits", count: 5, maxPerPool: 6, wantSizes: []int{5}},
		{name: "the fewest pools, balanced", count: 13, maxPerPool: 6, wantSizes: []int{5, 4, 4}},
		{name: "never more than ten per pool, whatever the stage allows", count: 12, maxPerPool: 12, wantSizes: []int{6, 6}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			f := newProposalFixture(tt.count, tt.maxPerPool, nil)
			out, err := f.propose(t, entrantIDs(1, tt.count)...)
			require.NoError(t, err)

			seen := map[string]bool{}
			sizes := make([]int, 0, len(out.Body.Pools))
			for i, proposed := range out.Body.Pools {
				assert.Equal(t, i+1, proposed.Number)
				sizes = append(sizes, len(proposed.Fencers))
				for _, fencer := range proposed.Fencers {
					assert.False(t, seen[fencer.CompetitorID], "competitor %s proposed twice", fencer.CompetitorID)
					seen[fencer.CompetitorID] = true

					stored := f.repo.Entrants[uuid.MustParse(fencer.CompetitorID)]
					assert.Equal(t, stored.FirstName, fencer.FirstName)
					assert.Equal(t, stored.LastName, fencer.LastName)
					assert.Equal(t, string(stored.Rating), fencer.Rating)
					assert.Equal(t, stored.Team, fencer.Team)
				}
			}
			assert.ElementsMatch(t, tt.wantSizes, sizes)
			assert.Len(t, seen, tt.count, "every competitor is proposed once")
		})
	}
}

func TestProposePoolsKeepsClubmatesApart(t *testing.T) {
	t.Parallel()

	f := newProposalFixture(8, 4, map[int]string{1: "Allez", 2: "Allez"})
	out, err := f.propose(t, entrantIDs(1, 8)...)
	require.NoError(t, err)

	poolOf := map[string]int{}
	for _, proposed := range out.Body.Pools {
		for _, fencer := range proposed.Fencers {
			poolOf[fencer.CompetitorID] = proposed.Number
		}
	}
	assert.NotEqual(t, poolOf[entrant(1).String()], poolOf[entrant(2).String()])
}

func TestProposePoolsRejects(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		prepare    func(f *proposalFixture)
		ids        []string
		wantCode   int
		wantDetail string
	}{
		{
			name:       "a competitor listed twice",
			ids:        []string{entrant(1).String(), entrant(2).String(), entrant(1).String()},
			wantCode:   http.StatusBadRequest,
			wantDetail: fmt.Sprintf("competitor %s is listed more than once", entrant(1)),
		},
		{
			name:       "a competitor that does not exist",
			ids:        []string{entrant(1).String(), entrant(99).String()},
			wantCode:   http.StatusBadRequest,
			wantDetail: fmt.Sprintf("competitor %s does not exist", entrant(99)),
		},
		{
			name:       "a competitor from another tournament",
			prepare:    func(f *proposalFixture) { f.enter(9, ptr(uuid.New()), "A", "Elsewhere") },
			ids:        []string{entrant(1).String(), entrant(9).String()},
			wantCode:   http.StatusBadRequest,
			wantDetail: fmt.Sprintf("competitor %s is not entered in this pool stage's tournament", entrant(9)),
		},
		{
			name:       "a competitor in no tournament",
			prepare:    func(f *proposalFixture) { f.enter(9, nil, "A", "Unattached") },
			ids:        []string{entrant(1).String(), entrant(9).String()},
			wantCode:   http.StatusBadRequest,
			wantDetail: fmt.Sprintf("competitor %s is not entered in this pool stage's tournament", entrant(9)),
		},
		{
			name: "a pool stage that is no longer upcoming",
			prepare: func(f *proposalFixture) {
				f.stage.Status = poolstage.PoolStageStatusActive
				f.repo.PoolStages[f.stage.ID] = f.stage
			},
			ids:        entrantIDs(1, 4),
			wantCode:   http.StatusConflict,
			wantDetail: "pools can only be proposed for an upcoming pool stage",
		},
		{
			name:       "an unknown pool stage",
			prepare:    func(f *proposalFixture) { delete(f.repo.PoolStages, f.stage.ID) },
			ids:        entrantIDs(1, 4),
			wantCode:   http.StatusNotFound,
			wantDetail: "not found",
		},
		{
			name:       "a repository failure",
			prepare:    func(f *proposalFixture) { f.repo.Err = errors.New("connection refused") },
			ids:        entrantIDs(1, 4),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			f := newProposalFixture(4, 6, nil)
			if tt.prepare != nil {
				tt.prepare(f)
			}

			out, err := f.propose(t, tt.ids...)

			code, detail := apiError(t, err)
			assert.Equal(t, tt.wantCode, code)
			assert.Equal(t, tt.wantDetail, detail)
			assert.Nil(t, out)
		})
	}
}
