package eventresult

import (
	"boutline/internal/features/directelimination"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
)

func rankPoolStageResults(
	fencers []PoolStageResultFencer,
	bouts []pool.PoolSheetBoutRow,
	entrants []directelimination.DirectEliminationEntrant,
) []PoolStageResultRow {
	byID := make(map[uuid.UUID]PoolStageResultFencer, len(fencers))
	ids := make([]uuid.UUID, 0, len(fencers))
	for _, fencer := range fencers {
		byID[fencer.CompetitorID] = fencer
		ids = append(ids, fencer.CompetitorID)
	}

	entered := make(map[uuid.UUID]bool, len(entrants))
	for _, entrant := range entrants {
		entered[entrant.CompetitorID] = true
	}

	ranks := pool.RankPoolStage(ids, bouts)
	rows := make([]PoolStageResultRow, 0, len(ranks))
	for _, rank := range ranks {
		rows = append(rows, PoolStageResultRow{
			Fencer:   byID[rank.CompetitorID],
			Standing: rank.Standing,
			Status:   poolStageResultStatus(entered, rank.CompetitorID),
		})
	}

	return rows
}

// The tableau is drawn in one step, so having no entrants at all means it hasn't been.
func poolStageResultStatus(entered map[uuid.UUID]bool, id uuid.UUID) PoolStageResultStatus {
	switch {
	case len(entered) == 0:
		return PoolStageResultStatusPending
	case entered[id]:
		return PoolStageResultStatusAdvanced
	default:
		return PoolStageResultStatusEliminated
	}
}
