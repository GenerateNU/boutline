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

var ratingStrength = []competitor.Rating{
	competitor.RatingA,
	competitor.RatingB,
	competitor.RatingC,
	competitor.RatingD,
	competitor.RatingE,
	competitor.RatingU,
}

// GenerateSeed splits entries into the fewest pools of at most maxPerPool,
// dealt out in a snake by rating so every pool is equally strong, then moves
// clubmates apart without letting anyone leave their snake pass. Each pool
// lists its fencers from strongest seed down; rng breaks ties between equal
// ratings.
func GenerateSeed(entries []SeedEntry, maxPerPool int, rng *rand.Rand) ([][]uuid.UUID, error) {
	if maxPerPool < 2 {
		return nil, errs.Public("max_competitor_per_pool must be at least 2", errs.ErrInvalidInput)
	}
	if len(entries) < 2 {
		return nil, errs.Public("at least 2 competitors are needed to generate pools", errs.ErrInvalidInput)
	}

	seeded := rankEntries(entries, rng)
	poolCount := (len(seeded) + maxPerPool - 1) / maxPerPool
	pools := make([][]SeedEntry, poolCount)

	for start := 0; start < len(seeded); start += poolCount {
		tier := seeded[start:min(start+poolCount, len(seeded))]
		placeTier(pools, tier, (start/poolCount)%2 == 1)
	}

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
			cmp.Compare(slices.Index(ratingStrength, a.Rating), slices.Index(ratingStrength, b.Rating)),
			cmp.Compare(b.RatingYear, a.RatingYear),
		)
	})
	return ranked
}

// placeTier gives each fencer of one snake pass a different pool. Starting from
// the snake positions, it swaps fencers between pools, nearest pool first,
// while a swap lowers the tier's total clubmate clashes. Swapping only within
// a tier keeps one fencer per tier in every pool, so the rating balance and
// the pool sizes hold. A partial last tier can also move into an empty slot.
func placeTier(pools [][]SeedEntry, tier []SeedEntry, reversed bool) {
	owner := snakeOwners(len(pools), len(tier), reversed)
	clash := func(p, i int) int {
		if i < 0 {
			return 0
		}
		return clubmates(pools[p], tier[i].Club)
	}

	for improved := true; improved; {
		improved = false
		for p := range pools {
		search:
			for d := 1; d < len(pools); d++ {
				for _, q := range [2]int{p - d, p + d} {
					if q < 0 || q >= len(pools) {
						continue
					}
					if clash(p, owner[q])+clash(q, owner[p]) < clash(p, owner[p])+clash(q, owner[q]) {
						owner[p], owner[q] = owner[q], owner[p]
						improved = true
						break search
					}
				}
			}
		}
	}

	for p, i := range owner {
		if i >= 0 {
			pools[p] = append(pools[p], tier[i])
		}
	}
}

// snakeOwners maps each pool to the tier index the snake deals it, or -1 when
// a partial tier runs out before reaching that pool.
func snakeOwners(poolCount, tierSize int, reversed bool) []int {
	owner := make([]int, poolCount)
	for p := range owner {
		owner[p] = p
		if reversed {
			owner[p] = poolCount - 1 - p
		}
		if owner[p] >= tierSize {
			owner[p] = -1
		}
	}
	return owner
}

func clubmates(pool []SeedEntry, club string) int {
	club = strings.TrimSpace(club)
	if club == "" {
		return 0
	}

	count := 0
	for _, entry := range pool {
		if strings.EqualFold(strings.TrimSpace(entry.Club), club) {
			count++
		}
	}
	return count
}
