package pool

import "github.com/google/uuid"

// newPoolLineup builds every bout a pool's fencers fence, ready to insert. Fencers
// take grid positions in the order given, which Propose (§11.2) returns in seed
// order and an admin may adjust.
func newPoolLineup(
	pool Pool,
	fencers []uuid.UUID,
	tournamentID uuid.UUID,
	pointsToWin, timeLimitSeconds int,
) PoolLineup {
	order := poolBoutOrder(len(fencers))
	bouts := make([]PoolBout, 0, len(order))
	for i, pair := range order {
		// poolBoutOrder numbers grid positions from 1.
		first, second := fencers[pair[0]-1], fencers[pair[1]-1]

		// A pool's bouts copy its strip, referee and number (design §11.1).
		bouts = append(bouts, PoolBout{
			TournamentID:     tournamentID,
			Slot:             i + 1,
			Competitor1ID:    first,
			Competitor2ID:    second,
			Location:         pool.Strip,
			RefereeID:        pool.RefereeID,
			GroupNumber:      pool.Number,
			PointsToWin:      pointsToWin,
			TimeLimitSeconds: timeLimitSeconds,
			Status:           poolBoutStatusUpcoming,
		})
	}

	return PoolLineup{Pool: pool, Fencers: fencers, Bouts: bouts}
}
