package poolresult

import (
	"boutline/internal/features/pool"

	"github.com/google/uuid"
)

func rankPoolResults(fencers []PoolResultFencer, bouts []pool.PoolSheetBoutRow, entrantIDs []uuid.UUID) []PoolResultRow {
	byID := make(map[uuid.UUID]PoolResultFencer, len(fencers))
	ids := make([]uuid.UUID, 0, len(fencers))
	for _, fencer := range fencers {
		byID[fencer.CompetitorID] = fencer
		ids = append(ids, fencer.CompetitorID)
	}

	entered := make(map[uuid.UUID]bool, len(entrantIDs))
	for _, id := range entrantIDs {
		entered[id] = true
	}

	ranks := pool.RankPoolStage(ids, bouts)
	rows := make([]PoolResultRow, 0, len(ranks))
	for _, rank := range ranks {
		rows = append(rows, PoolResultRow{
			Fencer:   byID[rank.CompetitorID],
			Standing: rank.Standing,
			Status:   poolResultStatus(entered, rank.CompetitorID),
		})
	}

	return rows
}

// The tableau is drawn in one step, so having no entrants at all means it hasn't been.
func poolResultStatus(entered map[uuid.UUID]bool, id uuid.UUID) PoolResultStatus {
	switch {
	case len(entered) == 0:
		return PoolResultStatusPending
	case entered[id]:
		return PoolResultStatusAdvanced
	default:
		return PoolResultStatusEliminated
	}
}
