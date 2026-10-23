package test

import (
	"fmt"
	"math"
	"math/rand/v2"
	"slices"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/features/competitor"
	"boutline/internal/features/poolstage"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fencer struct {
	name   string
	rating competitor.Rating
	year   int
	club   string
}

// rankedFencers returns s1..sn, all A-rated with s1 the most recent, so the
// seed order is fixed. They come back reversed to show input order is ignored.
func rankedFencers(n int, clubs map[string]string) []fencer {
	fencers := make([]fencer, n)
	for i := range fencers {
		name := fmt.Sprintf("s%d", i+1)
		fencers[i] = fencer{name: name, rating: competitor.RatingA, year: 99 - i, club: clubs[name]}
	}
	slices.Reverse(fencers)
	return fencers
}

// generatePoolNames runs GenerateSeed and maps the pools back to fencer names.
func generatePoolNames(t *testing.T, fencers []fencer, maxPerPool int) [][]string {
	t.Helper()

	entries := make([]poolstage.SeedEntry, len(fencers))
	names := make(map[uuid.UUID]string, len(fencers))
	for i, f := range fencers {
		id := uuid.New()
		names[id] = f.name
		entries[i] = poolstage.SeedEntry{CompetitorID: id, Rating: f.rating, RatingYear: f.year, Club: f.club}
	}

	pools, err := poolstage.GenerateSeed(entries, maxPerPool, rand.New(rand.NewPCG(1, 2)))
	require.NoError(t, err)

	got := make([][]string, len(pools))
	for p, pool := range pools {
		for _, id := range pool {
			got[p] = append(got[p], names[id])
		}
	}
	return got
}

func TestGenerateSeedAssignsPools(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		fencers    []fencer
		maxPerPool int
		want       [][]string
	}{
		{
			name:       "deals seeds out in a snake",
			fencers:    rankedFencers(9, nil),
			maxPerPool: 3,
			want:       [][]string{{"s1", "s6", "s7"}, {"s2", "s5", "s8"}, {"s3", "s4", "s9"}},
		},
		{
			name: "rating letter outranks year and unrated seeds last",
			fencers: []fencer{
				{name: "u", rating: competitor.RatingU},
				{name: "b25", rating: competitor.RatingB, year: 25},
				{name: "a20", rating: competitor.RatingA, year: 20},
				{name: "a25", rating: competitor.RatingA, year: 25},
			},
			maxPerPool: 2,
			want:       [][]string{{"a25", "u"}, {"a20", "b25"}},
		},
		{
			name:       "moves a clubmate down the seed order into the next tier",
			fencers:    rankedFencers(9, map[string]string{"s1": "Boston", "s6": "Boston"}),
			maxPerPool: 3,
			want:       [][]string{{"s1", "s7", "s8"}, {"s2", "s5", "s6"}, {"s3", "s4", "s9"}},
		},
		{
			name:       "matches clubs ignoring case and surrounding spaces",
			fencers:    rankedFencers(9, map[string]string{"s1": "Boston FC", "s6": " boston fc "}),
			maxPerPool: 3,
			want:       [][]string{{"s1", "s7", "s8"}, {"s2", "s5", "s6"}, {"s3", "s4", "s9"}},
		},
		{
			name:       "keeps moving down past every pool with a clubmate",
			fencers:    rankedFencers(9, map[string]string{"s1": "Boston", "s2": "Boston", "s6": "Boston"}),
			maxPerPool: 3,
			want:       [][]string{{"s1", "s7", "s8"}, {"s2", "s5", "s9"}, {"s3", "s4", "s6"}},
		},
		{
			name:       "fencers without a club never clash",
			fencers:    rankedFencers(9, map[string]string{"s1": "", "s6": ""}),
			maxPerPool: 3,
			want:       [][]string{{"s1", "s6", "s7"}, {"s2", "s5", "s8"}, {"s3", "s4", "s9"}},
		},
		{
			name:       "keeps the slot when no clubmate-free pool has room",
			fencers:    rankedFencers(5, map[string]string{"s1": "Boston", "s5": "Boston"}),
			maxPerPool: 3,
			want:       [][]string{{"s1", "s4", "s5"}, {"s2", "s3"}},
		},
		{
			name: "keeps the snake when every pool clashes anyway",
			fencers: rankedFencers(4, map[string]string{
				"s1": "Boston", "s2": "Boston", "s3": "Boston", "s4": "Boston",
			}),
			maxPerPool: 2,
			want:       [][]string{{"s1", "s4"}, {"s2", "s3"}},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			assert.Equal(t, tc.want, generatePoolNames(t, tc.fencers, tc.maxPerPool))
		})
	}
}

func TestGenerateSeedPoolSizes(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		count      int
		maxPerPool int
		wantSizes  []int
	}{
		{name: "exactly one full pool", count: 7, maxPerPool: 7, wantSizes: []int{7}},
		{name: "one over the max splits evenly", count: 8, maxPerPool: 7, wantSizes: []int{4, 4}},
		{name: "forward partial tier fills the first pools", count: 20, maxPerPool: 7, wantSizes: []int{7, 7, 6}},
		{name: "reversed partial tier fills the last pools", count: 11, maxPerPool: 4, wantSizes: []int{3, 4, 4}},
		{name: "smallest possible pool", count: 2, maxPerPool: 2, wantSizes: []int{2}},
		{name: "huge max does not overflow the pool count", count: 2, maxPerPool: math.MaxInt, wantSizes: []int{2}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			fencers := make([]fencer, tc.count)
			for i := range fencers {
				fencers[i] = fencer{name: fmt.Sprintf("f%d", i), rating: competitor.RatingU}
			}

			pools := generatePoolNames(t, fencers, tc.maxPerPool)

			sizes := make([]int, len(pools))
			var placed []string
			for p, pool := range pools {
				sizes[p] = len(pool)
				placed = append(placed, pool...)
			}
			assert.Equal(t, tc.wantSizes, sizes)

			want := make([]string, tc.count)
			for i, f := range fencers {
				want[i] = f.name
			}
			assert.ElementsMatch(t, want, placed)
		})
	}
}

func TestGenerateSeedRejects(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		count      int
		maxPerPool int
		rating     competitor.Rating
		wantDetail string
	}{
		{
			name: "pool max below two", count: 4, maxPerPool: 1, rating: competitor.RatingU,
			wantDetail: "max_competitor_per_pool must be at least 2",
		},
		{
			name: "a single competitor", count: 1, maxPerPool: 6, rating: competitor.RatingU,
			wantDetail: "at least 2 competitors are needed to generate pools",
		},
		{
			name: "no competitors", count: 0, maxPerPool: 6, rating: competitor.RatingU,
			wantDetail: "at least 2 competitors are needed to generate pools",
		},
		{
			name: "empty rating", count: 3, maxPerPool: 6, rating: "",
			wantDetail: "every competitor needs a rating of A, B, C, D, E or U",
		},
		{
			name: "unknown rating", count: 3, maxPerPool: 6, rating: "Z",
			wantDetail: "every competitor needs a rating of A, B, C, D, E or U",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			entries := make([]poolstage.SeedEntry, tc.count)
			for i := range entries {
				entries[i] = poolstage.SeedEntry{CompetitorID: uuid.New(), Rating: tc.rating}
			}

			pools, err := poolstage.GenerateSeed(entries, tc.maxPerPool, rand.New(rand.NewPCG(1, 2)))

			assert.Nil(t, pools)
			require.ErrorIs(t, err, errs.ErrInvalidInput)
			assert.Equal(t, tc.wantDetail, errs.ClientMessage(err))
		})
	}
}
