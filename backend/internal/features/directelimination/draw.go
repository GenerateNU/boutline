package directelimination

import (
	"math/rand/v2"
	"slices"

	"boutline/internal/errs"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
)

type TableauPairing struct {
	Slot        int
	Top, Bottom uuid.UUID
}

// TableauDraw is the seeded field and its first round. Seeds[i] holds seed i+1,
// and FirstRound omits byes: a seed with no opponent skips the round.
type TableauDraw struct {
	Size       int
	Seeds      []uuid.UUID
	FirstRound []TableauPairing
}

// DrawTableau cuts a pool-stage ranking to the advancing fencers, seeds them,
// and pairs them into the smallest power-of-two bracket; rng breaks ties
// between fencers of equal place.
func DrawTableau(ranking []pool.StageRank, advancePercent int, rng *rand.Rand) (TableauDraw, error) {
	if advancePercent < 1 || advancePercent > 100 {
		return TableauDraw{}, errs.Public("advance_percent must be between 1 and 100", errs.ErrInvalidInput)
	}

	kept := advancing(ranking, advancePercent)
	if len(kept) < 2 {
		return TableauDraw{}, errs.Public("at least 2 fencers must advance to draw a tableau", errs.ErrInvalidInput)
	}

	// Shuffling before a stable sort turns every run of equal places into a random draw.
	rng.Shuffle(len(kept), func(i, j int) { kept[i], kept[j] = kept[j], kept[i] })
	slices.SortStableFunc(kept, func(a, b pool.StageRank) int { return a.Standing.Place - b.Standing.Place })

	seeds := make([]uuid.UUID, len(kept))
	for i, rank := range kept {
		seeds[i] = rank.CompetitorID
	}

	size := 2
	for size < len(seeds) {
		size *= 2
	}

	return TableauDraw{Size: size, Seeds: seeds, FirstRound: firstRound(seeds, size)}, nil
}

// advancing rounds the quota up so a fraction of a fencer never costs anyone a
// place, and keeps everyone tied with the last qualifier; ranking is sorted by place.
func advancing(ranking []pool.StageRank, advancePercent int) []pool.StageRank {
	quota := (len(ranking)*advancePercent + 99) / 100
	if quota == 0 {
		return nil
	}

	cutPlace := ranking[quota-1].Standing.Place
	count := quota
	for count < len(ranking) && ranking[count].Standing.Place <= cutPlace {
		count++
	}

	return slices.Clone(ranking[:count])
}

func firstRound(seeds []uuid.UUID, size int) []TableauPairing {
	order := bracketOrder(size)

	var pairings []TableauPairing
	for slot := 1; slot <= size/2; slot++ {
		top, bottom := order[2*slot-2], order[2*slot-1]
		if top > len(seeds) || bottom > len(seeds) {
			continue
		}
		pairings = append(pairings, TableauPairing{Slot: slot, Top: seeds[top-1], Bottom: seeds[bottom-1]})
	}

	return pairings
}

// bracketOrder lists seeds by bracket position. Doubling a bracket pairs each
// seed s with size+1-s, so the top seeds can only meet in the latest rounds.
func bracketOrder(size int) []int {
	order := []int{1, 2}
	for n := 4; n <= size; n *= 2 {
		next := make([]int, 0, n)
		for _, s := range order {
			next = append(next, s, n+1-s)
		}
		order = next
	}

	return order
}
