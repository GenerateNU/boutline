package pool

import (
	"bytes"
	"slices"

	"github.com/google/uuid"
)

func newPoolLineup(pool Pool, entrants []PoolEntrant, tournamentID uuid.UUID, pointsToWin, timeLimitSeconds int) PoolLineup {
	seated := slices.Clone(entrants)
	slices.SortFunc(seated, func(a, b PoolEntrant) int {
		if byCreated := a.CreatedAt.Compare(b.CreatedAt); byCreated != 0 {
			return byCreated
		}
		// Bytewise matches Postgres uuid ordering.
		return bytes.Compare(a.ID[:], b.ID[:])
	})

	fencers := make([]uuid.UUID, 0, len(seated))
	for _, entrant := range seated {
		fencers = append(fencers, entrant.ID)
	}

	order := poolBoutOrder(len(fencers))
	bouts := make([]PoolBout, 0, len(order))
	for k, pair := range order {
		bouts = append(bouts, PoolBout{
			TournamentID:     tournamentID,
			PoolOrder:        k + 1,
			Competitor1ID:    fencers[pair[0]-1],
			Competitor2ID:    fencers[pair[1]-1],
			Location:         pool.Strip,
			RefereeID:        pool.RefereeID,
			PointsToWin:      pointsToWin,
			TimeLimitSeconds: timeLimitSeconds,
			GroupNumber:      pool.Number,
			Status:           poolBoutStatusUpcoming,
		})
	}

	return PoolLineup{Pool: pool, Fencers: fencers, Bouts: bouts}
}
