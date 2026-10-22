package poolstage

import (
	"cmp"
	"math/rand/v2"
	"slices"
	"strings"

	"boutline/internal/errs"
	"boutline/internal/features/competitor"

	"github.com/google/uuid"
)

// SeedEntry is what seeding needs to know about one fencer. RatingYear is the
// year a rating was earned (24 in C24) and 0 when unknown; Club is matched
// case-insensitively and an empty club never clashes with anyone.
type SeedEntry struct {
	CompetitorID uuid.UUID
	Rating       competitor.Rating
	RatingYear   int
	Club         string
}

// GenerateSeed splits entries into the fewest pools of at most maxPerPool,
// dealt out in a snake by rating so every pool is equally strong, with
// clubmates kept apart as FIE o.68.2 keeps compatriots apart. Each pool lists
// its fencers in seed order; rng breaks ties between equal ratings.
func GenerateSeed(entries []SeedEntry, maxPerPool int, rng *rand.Rand) ([][]uuid.UUID, error) {
	if maxPerPool < 2 {
		return nil, errs.Public("max_competitor_per_pool must be at least 2", errs.ErrInvalidInput)
	}
	if len(entries) < 2 {
		return nil, errs.Public("at least 2 competitors are needed to generate pools", errs.ErrInvalidInput)
	}
	for _, entry := range entries {
		if !entry.Rating.IsValid() {
			return nil, errs.Public("every competitor needs a rating of A, B, C, D, E or U", errs.ErrInvalidInput)
		}
	}

	seeded := rankEntries(entries, rng)
	poolCount := 1 + (len(seeded)-1)/maxPerPool
	pools := fillSnake(seeded, snakeSlots(len(seeded), poolCount), poolCount)

	ids := make([][]uuid.UUID, poolCount)
	for p, pool := range pools {
		for _, entry := range pool {
			ids[p] = append(ids[p], entry.CompetitorID)
		}
	}
	return ids, nil
}

// Shuffling before a stable sort turns every run of equal ratings into a
// random draw.
func rankEntries(entries []SeedEntry, rng *rand.Rand) []SeedEntry {
	ranked := slices.Clone(entries)
	rng.Shuffle(len(ranked), func(i, j int) { ranked[i], ranked[j] = ranked[j], ranked[i] })
	slices.SortStableFunc(ranked, func(a, b SeedEntry) int {
		return cmp.Or(
			cmp.Compare(ratingRank(a.Rating), ratingRank(b.Rating)),
			cmp.Compare(b.RatingYear, a.RatingYear),
		)
	})
	return ranked
}

// ratingRank puts A first and U (unrated) last; ratings are validated before
// ranking, so an unknown letter never reaches here.
func ratingRank(r competitor.Rating) int {
	return strings.Index("ABCDEU", string(r))
}

// snakeSlots lists the pool each seed position lands in: left to right
// across the pools, then right to left, and so on.
func snakeSlots(count, poolCount int) []int {
	slots := make([]int, count)
	for k := range slots {
		slots[k] = k % poolCount
		if (k/poolCount)%2 == 1 {
			slots[k] = poolCount - 1 - k%poolCount
		}
	}
	return slots
}

// fillSnake fills the slots in order, each with the best remaining seed who
// has no clubmate in that slot's pool. A fencer passed over this way moves
// down the seed order, across tiers if need be, and stays first in line for
// the next slot. A fencer with no clubmate-free pool left keeps their slot.
func fillSnake(seeded []SeedEntry, slots []int, poolCount int) [][]SeedEntry {
	capacity := make([]int, poolCount)
	for _, p := range slots {
		capacity[p]++
	}

	pools := make([][]SeedEntry, poolCount)
	remaining := slices.Clone(seeded)
	for _, p := range slots {
		pick := 0
		for i, entry := range remaining {
			if !hasClubmate(pools[p], entry.Club) || !canAvoidClubmates(entry, pools, capacity) {
				pick = i
				break
			}
		}
		pools[p] = append(pools[p], remaining[pick])
		remaining = slices.Delete(remaining, pick, pick+1)
	}
	return pools
}

// canAvoidClubmates reports whether entry could still join a pool with an open
// slot and no clubmate. Every slot before the current one is filled, so an
// open slot is always further down the snake.
func canAvoidClubmates(entry SeedEntry, pools [][]SeedEntry, capacity []int) bool {
	for p, pool := range pools {
		if len(pool) < capacity[p] && !hasClubmate(pool, entry.Club) {
			return true
		}
	}
	return false
}

func hasClubmate(pool []SeedEntry, club string) bool {
	club = strings.TrimSpace(club)
	if club == "" {
		return false
	}

	for _, entry := range pool {
		if strings.EqualFold(strings.TrimSpace(entry.Club), club) {
			return true
		}
	}
	return false
}
