package pool

import (
	"bytes"
	"cmp"
	"slices"

	"github.com/google/uuid"
)

type StageRank struct {
	CompetitorID uuid.UUID
	Standing     PoolStanding
}

// RankPoolStage ranks every fencer across a stage's pools; Standing.Place is stage-wide and shared on ties.
func RankPoolStage(competitorIDs []uuid.UUID, bouts []PoolSheetBoutRow) []StageRank {
	standings := RankPoolFencers(competitorIDs, bouts)
	ranks := make([]StageRank, 0, len(standings))
	for id, standing := range standings {
		ranks = append(ranks, StageRank{CompetitorID: id, Standing: standing})
	}

	slices.SortFunc(ranks, func(a, b StageRank) int {
		return cmp.Or(
			cmp.Compare(a.Standing.Place, b.Standing.Place),
			bytes.Compare(a.CompetitorID[:], b.CompetitorID[:]),
		)
	})

	return ranks
}

// RankPoolFencers ranks one pool, or a whole stage when given every pool's bouts at
// once: each fencer's tally only reads their own bouts (FIE o.73 general ranking).
func RankPoolFencers(competitorIDs []uuid.UUID, bouts []PoolSheetBoutRow) map[uuid.UUID]PoolStanding {
	standings := make(map[uuid.UUID]PoolStanding, len(competitorIDs))
	for _, id := range competitorIDs {
		standings[id] = PoolStanding{}
	}

	for _, bout := range bouts {
		if bout.Status != endedBoutStatus {
			continue
		}
		recordBoutSide(standings, bout.Competitor1ID, bout.Competitor1Score, bout.Competitor2Score)
		recordBoutSide(standings, bout.Competitor2ID, bout.Competitor2Score, bout.Competitor1Score)
	}

	for id, standing := range standings {
		if standing.Matches > 0 {
			standing.VictoryRatio = float64(standing.Victories) / float64(standing.Matches)
		}
		standing.Indicator = standing.TouchesScored - standing.TouchesReceived
		standings[id] = standing
	}

	// Places are read from a snapshot so ranking one fencer never sees another's updated place.
	ranked := make(map[uuid.UUID]PoolStanding, len(standings))
	for id, standing := range standings {
		standing.Place = 1
		for _, other := range standings {
			if strictlyBetter(other, standing) {
				standing.Place++
			}
		}
		ranked[id] = standing
	}

	return ranked
}

func recordBoutSide(standings map[uuid.UUID]PoolStanding, id uuid.UUID, scored, received int) {
	standing, ok := standings[id]
	if !ok {
		return
	}

	standing.Matches++
	standing.TouchesScored += scored
	standing.TouchesReceived += received
	if scored > received {
		standing.Victories++
	}
	standings[id] = standing
}

// strictlyBetter ranks by victory ratio, then indicator, then touches scored. The
// ratios are compared by cross-multiplying, so equal fractions are always equal; a
// fencer with no matches has no victories, so counting their matches as 1 keeps
// their ratio at 0.
func strictlyBetter(a, b PoolStanding) bool {
	left, right := a.Victories*max(b.Matches, 1), b.Victories*max(a.Matches, 1)
	if left != right {
		return left > right
	}
	if a.Indicator != b.Indicator {
		return a.Indicator > b.Indicator
	}

	return a.TouchesScored > b.TouchesScored
}

func poolSheetWinnerID(bout PoolSheetBoutRow) *uuid.UUID {
	if bout.Status != endedBoutStatus {
		return nil
	}

	switch {
	case bout.Competitor1Score > bout.Competitor2Score:
		return &bout.Competitor1ID
	case bout.Competitor2Score > bout.Competitor1Score:
		return &bout.Competitor2ID
	default:
		return nil
	}
}
