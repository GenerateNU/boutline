package test

import (
	"testing"

	"boutline/internal/features/directelimination"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

type deBout = directelimination.DirectEliminationBoutScore

func seedIDs(n int) []uuid.UUID {
	ids := make([]uuid.UUID, n+1)
	for i := 1; i <= n; i++ {
		ids[i] = uuid.New()
	}
	return ids
}

func TestPlaceDirectEliminationFencers(t *testing.T) {
	t.Parallel()

	ids := seedIDs(8)
	entrantsFor := func(seeds ...int) []directelimination.DirectEliminationEntrant {
		out := make([]directelimination.DirectEliminationEntrant, len(seeds))
		for i, s := range seeds {
			out[i] = directelimination.DirectEliminationEntrant{CompetitorID: ids[s], Seed: s}
		}
		return out
	}
	bout := func(round int, status string, s1, score1, s2, score2 int) deBout {
		return deBout{
			RoundSize: round, Status: status,
			Competitor1ID: ids[s1], Competitor1Score: score1,
			Competitor2ID: ids[s2], Competitor2Score: score2,
		}
	}
	// placings expects (seed, place) pairs in order.
	placings := func(pairs ...int) []directelimination.DirectEliminationPlacing {
		out := make([]directelimination.DirectEliminationPlacing, 0, len(pairs)/2)
		for i := 0; i < len(pairs); i += 2 {
			out = append(out, directelimination.DirectEliminationPlacing{
				CompetitorID: ids[pairs[i]], Seed: pairs[i], Place: pairs[i+1],
			})
		}
		return out
	}
	const ended, active = "ended", "active"

	tests := []struct {
		name     string
		entrants []directelimination.DirectEliminationEntrant
		bouts    []deBout
		want     []directelimination.DirectEliminationPlacing
	}{
		{
			name:     "four fencers place 1, 2, 3, 3",
			entrants: entrantsFor(1, 2, 3, 4),
			bouts: []deBout{
				bout(4, ended, 1, 15, 4, 3),
				bout(4, ended, 2, 15, 3, 10),
				bout(2, ended, 1, 15, 2, 12),
			},
			want: placings(1, 1, 2, 2, 3, 3, 4, 3),
		},
		{
			name:     "eight fencers with upsets",
			entrants: entrantsFor(1, 2, 3, 4, 5, 6, 7, 8),
			bouts: []deBout{
				bout(8, ended, 1, 15, 8, 2),
				bout(8, ended, 4, 9, 5, 15),
				bout(8, ended, 3, 10, 6, 15),
				bout(8, ended, 2, 15, 7, 14),
				bout(4, ended, 1, 15, 5, 14),
				bout(4, ended, 6, 15, 2, 14),
				bout(2, ended, 1, 10, 6, 15),
			},
			want: placings(6, 1, 1, 2, 2, 3, 5, 3, 3, 5, 4, 6, 7, 7, 8, 8),
		},
		{
			name:     "byes: six entrants in a table of eight",
			entrants: entrantsFor(1, 2, 3, 4, 5, 6),
			bouts: []deBout{
				bout(8, ended, 4, 15, 5, 10),
				bout(8, ended, 6, 8, 3, 15),
				bout(4, ended, 1, 5, 4, 15),
				bout(4, ended, 2, 15, 3, 5),
				bout(2, ended, 4, 9, 2, 15),
			},
			want: placings(2, 1, 4, 2, 1, 3, 3, 3, 5, 5, 6, 6),
		},
		{
			name:     "quarterfinal losers are placed by seed, not losing score",
			entrants: entrantsFor(1, 2, 3, 4, 5, 6, 7, 8),
			bouts: []deBout{
				bout(8, ended, 1, 15, 8, 14),
				bout(8, ended, 4, 15, 5, 0),
				bout(8, ended, 3, 15, 6, 1),
				bout(8, ended, 2, 15, 7, 2),
			},
			want: placings(1, 1, 2, 1, 3, 1, 4, 1, 5, 5, 6, 6, 7, 7, 8, 8),
		},
		{
			name:     "level ended quarterfinal decides nothing but the semifinalist is credited",
			entrants: entrantsFor(1, 2, 3, 4, 5, 6, 7, 8),
			bouts: []deBout{
				bout(8, ended, 4, 5, 5, 5),
				bout(4, ended, 1, 15, 4, 3),
			},
			want: placings(1, 1, 4, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8),
		},
		{
			name:     "level ended final shares first and semifinal losers share third",
			entrants: entrantsFor(1, 2, 3, 4),
			bouts: []deBout{
				bout(4, ended, 1, 15, 4, 3),
				bout(4, ended, 2, 15, 3, 10),
				bout(2, ended, 1, 7, 2, 7),
			},
			want: placings(1, 1, 2, 1, 3, 3, 4, 3),
		},
		{
			name:     "active final decides nothing",
			entrants: entrantsFor(1, 2, 3, 4),
			bouts: []deBout{
				bout(4, ended, 1, 15, 4, 3),
				bout(4, ended, 2, 15, 3, 10),
				bout(2, active, 1, 15, 2, 3),
			},
			want: placings(1, 1, 2, 1, 3, 3, 4, 3),
		},
		{
			name:     "no bouts places by seed",
			entrants: entrantsFor(1, 2, 3, 4, 5, 6, 7, 8),
			want:     placings(1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8),
		},
		{
			name:     "bout sides that are not entrants are ignored",
			entrants: entrantsFor(1, 2),
			bouts: []deBout{
				{RoundSize: 2, Status: ended, Competitor1ID: ids[1], Competitor1Score: 15,
					Competitor2ID: uuid.New(), Competitor2Score: 3},
			},
			want: placings(1, 1, 2, 2),
		},
		{
			name:     "no entrants returns an empty result",
			entrants: nil,
			want:     []directelimination.DirectEliminationPlacing{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := directelimination.PlaceDirectEliminationFencers(tt.entrants, tt.bouts)
			assert.Equal(t, tt.want, got)
		})
	}
}
