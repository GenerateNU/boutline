package poolboard

import "github.com/google/uuid"

func poolBoardStandings(fencers []PoolBoardFencerRow, bouts []PoolBoardBoutRow) map[uuid.UUID]PoolBoardStanding {
	standings := make(map[uuid.UUID]PoolBoardStanding, len(fencers))
	for _, fencer := range fencers {
		standings[fencer.CompetitorID] = PoolBoardStanding{}
	}

	for _, bout := range bouts {
		if bout.Status != poolBoardBoutStatusEnded {
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
	ranked := make(map[uuid.UUID]PoolBoardStanding, len(standings))
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

func recordBoutSide(standings map[uuid.UUID]PoolBoardStanding, id uuid.UUID, scored, received int) {
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

// strictlyBetter ranks by victory ratio, then indicator, then touches scored.
func strictlyBetter(a, b PoolBoardStanding) bool {
	if a.VictoryRatio != b.VictoryRatio {
		return a.VictoryRatio > b.VictoryRatio
	}
	if a.Indicator != b.Indicator {
		return a.Indicator > b.Indicator
	}

	return a.TouchesScored > b.TouchesScored
}

func poolBoardWinnerID(bout PoolBoardBoutRow) *uuid.UUID {
	if bout.Status != poolBoardBoutStatusEnded {
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
