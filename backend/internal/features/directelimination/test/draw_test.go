package test

import (
	"fmt"
	"math/rand/v2"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func drawID(i int) uuid.UUID {
	return uuid.MustParse(fmt.Sprintf("d0000000-0000-4000-8000-%012d", i))
}

func rankingOf(place func(i int) int, n int) []pool.StageRank {
	ranking := make([]pool.StageRank, n)
	for i := 1; i <= n; i++ {
		ranking[i-1] = pool.StageRank{CompetitorID: drawID(i), Standing: pool.PoolStanding{Place: place(i)}}
	}

	return ranking
}

func distinctRanking(n int) []pool.StageRank {
	return rankingOf(func(i int) int { return i }, n)
}

// The 8th and 9th fencers share a place.
var tiedAtEighth = []int{1, 2, 3, 4, 5, 6, 7, 8, 8, 10}

func fixedRNG() *rand.Rand { return rand.New(rand.NewPCG(1, 2)) }

// pairs builds expected pairings from {slot, topSeed, bottomSeed} triples; with
// distinct places, seed k is fencer k.
func pairs(triples ...[3]int) []directelimination.TableauPairing {
	out := make([]directelimination.TableauPairing, len(triples))
	for i, t := range triples {
		out[i] = directelimination.TableauPairing{Slot: t[0], Top: drawID(t[1]), Bottom: drawID(t[2])}
	}

	return out
}

func TestDrawTableau(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		ranking  []pool.StageRank
		percent  int
		wantSize int
		wantKept int
		wantAll  []directelimination.TableauPairing
	}{
		{
			name:     "12 fencers draw 16 with the top four on byes",
			ranking:  distinctRanking(12),
			percent:  100,
			wantSize: 16,
			wantKept: 12,
			wantAll:  pairs([3]int{2, 8, 9}, [3]int{4, 5, 12}, [3]int{6, 7, 10}, [3]int{8, 6, 11}),
		},
		{
			name:     "2 fencers draw a final",
			ranking:  distinctRanking(2),
			percent:  100,
			wantSize: 2,
			wantKept: 2,
			wantAll:  pairs([3]int{1, 1, 2}),
		},
		{
			name:     "3 fencers draw 4 with seed 1 on a bye",
			ranking:  distinctRanking(3),
			percent:  100,
			wantSize: 4,
			wantKept: 3,
			wantAll:  pairs([3]int{2, 2, 3}),
		},
		{
			name:     "8 fencers fill a bracket of 8",
			ranking:  distinctRanking(8),
			percent:  100,
			wantSize: 8,
			wantKept: 8,
			wantAll:  pairs([3]int{1, 1, 8}, [3]int{2, 4, 5}, [3]int{3, 2, 7}, [3]int{4, 3, 6}),
		},
		{
			name:     "16 fencers fill a bracket of 16",
			ranking:  distinctRanking(16),
			percent:  100,
			wantSize: 16,
			wantKept: 16,
			wantAll: pairs(
				[3]int{1, 1, 16}, [3]int{2, 8, 9}, [3]int{3, 4, 13}, [3]int{4, 5, 12},
				[3]int{5, 2, 15}, [3]int{6, 7, 10}, [3]int{7, 3, 14}, [3]int{8, 6, 11},
			),
		},
		{
			name:     "80 percent of 10 keeps 8",
			ranking:  distinctRanking(10),
			percent:  80,
			wantSize: 8,
			wantKept: 8,
			wantAll:  pairs([3]int{1, 1, 8}, [3]int{2, 4, 5}, [3]int{3, 2, 7}, [3]int{4, 3, 6}),
		},
		{
			name:     "a tie at the cut line keeps everyone tied",
			ranking:  rankingOf(func(i int) int { return tiedAtEighth[i-1] }, 10),
			percent:  80,
			wantSize: 16,
			wantKept: 9,
		},
		{
			name:     "a fractional quota rounds up",
			ranking:  distinctRanking(10),
			percent:  25,
			wantSize: 4,
			wantKept: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := directelimination.DrawTableau(tt.ranking, tt.percent, fixedRNG())

			require.NoError(t, err)
			assert.Equal(t, tt.wantSize, got.Size)
			assert.Len(t, got.Seeds, tt.wantKept)
			if tt.wantAll != nil {
				assert.Equal(t, tt.wantAll, got.FirstRound)
			}
		})
	}
}

func TestDrawTableauTiesShuffleOnlyWithinAPlace(t *testing.T) {
	t.Parallel()

	ranking := rankingOf(func(i int) int { return (i-1)/3 + 1 }, 8)
	blocks := [][]uuid.UUID{
		{drawID(1), drawID(2), drawID(3)},
		{drawID(4), drawID(5), drawID(6)},
		{drawID(7), drawID(8)},
	}

	for seed := range uint64(20) {
		got, err := directelimination.DrawTableau(ranking, 100, rand.New(rand.NewPCG(seed, 2)))

		require.NoError(t, err)
		start := 0
		for _, block := range blocks {
			assert.ElementsMatch(t, block, got.Seeds[start:start+len(block)], "rng seed %d", seed)
			start += len(block)
		}
	}
}

func TestDrawTableauErrors(t *testing.T) {
	t.Parallel()

	const tooFew = "at least 2 fencers must advance to draw a tableau"
	const badPercent = "advance_percent must be between 1 and 100"

	tests := []struct {
		name    string
		ranking []pool.StageRank
		percent int
		want    string
	}{
		{"one fencer", distinctRanking(1), 100, tooFew},
		{"empty ranking", nil, 100, tooFew},
		{"cut leaves one fencer", distinctRanking(2), 1, tooFew},
		{"percent 0", distinctRanking(8), 0, badPercent},
		{"percent 101", distinctRanking(8), 101, badPercent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, err := directelimination.DrawTableau(tt.ranking, tt.percent, fixedRNG())

			require.Error(t, err)
			assert.Equal(t, 400, errs.StatusFor(err))
			assert.Equal(t, tt.want, errs.ClientMessage(err))
		})
	}
}
