package pool

import (
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func competitorID(n int) uuid.UUID {
	return uuid.MustParse(fmt.Sprintf("d0000000-0000-4000-8000-%012d", n))
}

func fencersOf(ns ...int) []PoolBoardFencerRow {
	rows := make([]PoolBoardFencerRow, 0, len(ns))
	for i, n := range ns {
		rows = append(rows, PoolBoardFencerRow{CompetitorID: competitorID(n), Position: i + 1})
	}

	return rows
}

func boutOf(status string, c1, score1, c2, score2 int) PoolBoardBoutRow {
	return PoolBoardBoutRow{
		ID:               uuid.New(),
		Status:           status,
		Competitor1ID:    competitorID(c1),
		Competitor2ID:    competitorID(c2),
		Competitor1Score: score1,
		Competitor2Score: score2,
	}
}

func standingOf(place, victories, matches, scored, received int) PoolBoardStanding {
	standing := PoolBoardStanding{
		Place:           place,
		Victories:       victories,
		Matches:         matches,
		TouchesScored:   scored,
		TouchesReceived: received,
		Indicator:       scored - received,
	}
	if matches > 0 {
		standing.VictoryRatio = float64(victories) / float64(matches)
	}

	return standing
}

func TestPoolBoardStandings(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		fencers []PoolBoardFencerRow
		bouts   []PoolBoardBoutRow
		want    map[int]PoolBoardStanding
	}{
		{
			name:    "pool 1 ranks by ratio, then indicator, then touches scored, ignoring unfinished bouts",
			fencers: fencersOf(1, 2, 3, 4),
			bouts: []PoolBoardBoutRow{
				boutOf("ended", 1, 5, 2, 2),
				boutOf("ended", 3, 5, 4, 3),
				boutOf("ended", 1, 5, 3, 4),
				boutOf("ended", 2, 2, 4, 5),
				boutOf("active", 1, 2, 4, 2),
				boutOf("upcoming", 2, 0, 3, 0),
			},
			want: map[int]PoolBoardStanding{
				1: standingOf(1, 2, 2, 10, 6),
				3: standingOf(2, 1, 2, 9, 8),
				4: standingOf(3, 1, 2, 8, 7),
				2: standingOf(4, 0, 2, 4, 10),
			},
		},
		{
			name:    "pool 2 ranks by indicator when ratios are equal",
			fencers: fencersOf(5, 6, 7, 8),
			bouts: []PoolBoardBoutRow{
				boutOf("ended", 5, 5, 6, 1),
				boutOf("ended", 7, 4, 8, 5),
			},
			want: map[int]PoolBoardStanding{
				5: standingOf(1, 1, 1, 5, 1),
				8: standingOf(2, 1, 1, 5, 4),
				7: standingOf(3, 0, 1, 4, 5),
				6: standingOf(4, 0, 1, 1, 5),
			},
		},
		{
			name:    "no bouts leaves every fencer tied for first with zeros",
			fencers: fencersOf(1, 2, 3),
			want: map[int]PoolBoardStanding{
				1: standingOf(1, 0, 0, 0, 0),
				2: standingOf(1, 0, 0, 0, 0),
				3: standingOf(1, 0, 0, 0, 0),
			},
		},
		{
			name:    "exact ties share a place and the next place is skipped",
			fencers: fencersOf(1, 2, 3),
			bouts: []PoolBoardBoutRow{
				boutOf("ended", 1, 5, 3, 0),
				boutOf("ended", 2, 5, 3, 0),
			},
			want: map[int]PoolBoardStanding{
				1: standingOf(1, 1, 1, 5, 0),
				2: standingOf(1, 1, 1, 5, 0),
				3: standingOf(3, 0, 2, 0, 10),
			},
		},
		{
			name:    "a fencer with no finished bouts has a ratio of 0 and ranks by indicator",
			fencers: fencersOf(1, 2, 3),
			bouts:   []PoolBoardBoutRow{boutOf("ended", 1, 5, 2, 3)},
			want: map[int]PoolBoardStanding{
				1: standingOf(1, 1, 1, 5, 3),
				3: standingOf(2, 0, 0, 0, 0),
				2: standingOf(3, 0, 1, 3, 5),
			},
		},
		{
			name:    "ratios with different match counts compare as exact fractions",
			fencers: fencersOf(1, 2, 3, 4),
			bouts: []PoolBoardBoutRow{
				boutOf("ended", 1, 5, 2, 0),
				boutOf("ended", 1, 5, 3, 0),
				boutOf("ended", 4, 5, 1, 0),
				boutOf("ended", 2, 5, 3, 0),
			},
			want: map[int]PoolBoardStanding{
				4: standingOf(1, 1, 1, 5, 0),
				1: standingOf(2, 2, 3, 10, 5),
				2: standingOf(3, 1, 2, 5, 5),
				3: standingOf(4, 0, 2, 0, 10),
			},
		},
		{
			name:    "an ended tied score is a match for both and a victory for neither",
			fencers: fencersOf(1, 2),
			bouts:   []PoolBoardBoutRow{boutOf("ended", 1, 3, 2, 3)},
			want: map[int]PoolBoardStanding{
				1: standingOf(1, 0, 1, 3, 3),
				2: standingOf(1, 0, 1, 3, 3),
			},
		},
		{
			name:    "a bout side that is not a fencer in the pool is ignored",
			fencers: fencersOf(1),
			bouts:   []PoolBoardBoutRow{boutOf("ended", 1, 5, 9, 1)},
			want: map[int]PoolBoardStanding{
				1: standingOf(1, 1, 1, 5, 1),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := poolBoardStandings(tt.fencers, tt.bouts)

			assert.Len(t, got, len(tt.want))
			for n, want := range tt.want {
				assert.Equal(t, want, got[competitorID(n)], "competitor %d", n)
			}
		})
	}
}

func TestPoolBoardWinnerID(t *testing.T) {
	t.Parallel()

	one, two := competitorID(1), competitorID(2)

	tests := []struct {
		name string
		bout PoolBoardBoutRow
		want *uuid.UUID
	}{
		{name: "ended with competitor 1 ahead", bout: boutOf("ended", 1, 5, 2, 3), want: &one},
		{name: "ended with competitor 2 ahead", bout: boutOf("ended", 1, 2, 2, 5), want: &two},
		{name: "ended tied", bout: boutOf("ended", 1, 4, 2, 4)},
		{name: "active has no winner", bout: boutOf("active", 1, 5, 2, 0)},
		{name: "upcoming has no winner", bout: boutOf("upcoming", 1, 0, 2, 0)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			assert.Equal(t, tt.want, poolBoardWinnerID(tt.bout))
		})
	}
}
