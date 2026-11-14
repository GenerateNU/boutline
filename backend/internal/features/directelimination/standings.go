package directelimination

import (
	"sort"

	"github.com/google/uuid"
)

// Mirrors bout.BoutStatusEnded, which can't be imported because bout imports this package.
const directEliminationBoutStatusEnded = "ended"

const semifinalRoundSize = 4

type DirectEliminationEntrant struct {
	CompetitorID uuid.UUID
	Seed         int
}

type DirectEliminationBoutScore struct {
	RoundSize        int
	Status           string
	Competitor1ID    uuid.UUID `gorm:"column:competitor_1_id"`
	Competitor2ID    uuid.UUID `gorm:"column:competitor_2_id"`
	Competitor1Score int       `gorm:"column:competitor_1_score"`
	Competitor2Score int       `gorm:"column:competitor_2_score"`
}

type DirectEliminationPlacing struct {
	CompetitorID uuid.UUID
	Seed         int
	Place        int
}

type reachedEntrant struct {
	DirectEliminationEntrant
	reached int
}

// PlaceDirectEliminationFencers ranks entrants by the tableau round they lost
// in (FIE o.82); DE scores never affect placing.
func PlaceDirectEliminationFencers(
	entrants []DirectEliminationEntrant,
	bouts []DirectEliminationBoutScore,
) []DirectEliminationPlacing {
	tableSize := 2
	for tableSize < len(entrants) {
		tableSize *= 2
	}

	reached := make(map[uuid.UUID]int, len(entrants))
	for _, e := range entrants {
		reached[e.CompetitorID] = tableSize
	}
	credit := func(id uuid.UUID, roundSize int, won bool) {
		current, ok := reached[id]
		if !ok {
			return
		}
		if won {
			roundSize /= 2
		}
		reached[id] = min(current, roundSize)
	}
	for _, b := range bouts {
		ended := b.Status == directEliminationBoutStatusEnded
		credit(b.Competitor1ID, b.RoundSize, ended && b.Competitor1Score > b.Competitor2Score)
		credit(b.Competitor2ID, b.RoundSize, ended && b.Competitor2Score > b.Competitor1Score)
	}

	ranked := make([]reachedEntrant, len(entrants))
	for i, e := range entrants {
		ranked[i] = reachedEntrant{e, reached[e.CompetitorID]}
	}

	placings := make([]DirectEliminationPlacing, len(ranked))
	for i, e := range ranked {
		place := 1
		for _, other := range ranked {
			if better(other, e) {
				place++
			}
		}
		placings[i] = DirectEliminationPlacing{CompetitorID: e.CompetitorID, Seed: e.Seed, Place: place}
	}
	sort.Slice(placings, func(i, j int) bool {
		if placings[i].Place != placings[j].Place {
			return placings[i].Place < placings[j].Place
		}
		return placings[i].Seed < placings[j].Seed
	})
	return placings
}

// Semifinal losers share third because there is no bronze bout (FIE o.82);
// quarterfinal losers and below are separated by seed.
func better(a, b reachedEntrant) bool {
	return a.reached < b.reached ||
		(a.reached == b.reached && a.reached > semifinalRoundSize && a.Seed < b.Seed)
}
