package eventresult

import (
	"slices"
	"strings"

	"boutline/internal/features/directelimination"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
)

func eventResultCompetitorIDs(in eventResultInputs) []uuid.UUID {
	ids := poolBoutCompetitorIDs(in.poolBouts)
	seen := make(map[uuid.UUID]bool, len(ids))
	for _, id := range ids {
		seen[id] = true
	}
	for _, entrant := range in.entrants {
		if !seen[entrant.CompetitorID] {
			seen[entrant.CompetitorID] = true
			ids = append(ids, entrant.CompetitorID)
		}
	}

	return ids
}

func poolBoutCompetitorIDs(bouts []pool.PoolSheetBoutRow) []uuid.UUID {
	var ids []uuid.UUID
	seen := make(map[uuid.UUID]bool)
	for _, bout := range bouts {
		for _, id := range []uuid.UUID{bout.Competitor1ID, bout.Competitor2ID} {
			if !seen[id] {
				seen[id] = true
				ids = append(ids, id)
			}
		}
	}

	return ids
}

type rankedResult struct {
	row  EventResultRow
	seed int
}

func aggregateEventResults(in eventResultInputs, competitors map[uuid.UUID]EventResultCompetitor) []EventResultRow {
	placings := directelimination.PlaceDirectEliminationFencers(in.entrants, in.tableauBouts)
	poolRanking := pool.RankPoolFencers(poolBoutCompetitorIDs(in.poolBouts), in.poolBouts)

	var results []rankedResult
	entered := make(map[uuid.UUID]bool, len(placings))
	for _, placing := range placings {
		entered[placing.CompetitorID] = true
		if c, ok := competitors[placing.CompetitorID]; ok {
			results = append(results, rankedResult{
				row:  EventResultRow{Place: placing.Place, DecidedBy: EventResultStageDirectElimination, Competitor: c},
				seed: placing.Seed,
			})
		}
	}

	cutPlaces := make(map[uuid.UUID]int)
	for id, standing := range poolRanking {
		if !entered[id] {
			cutPlaces[id] = standing.Place
		}
	}
	for id, poolPlace := range cutPlaces {
		c, ok := competitors[id]
		if !ok {
			continue
		}
		better := 0
		for _, other := range cutPlaces {
			if other < poolPlace {
				better++
			}
		}
		results = append(results, rankedResult{
			row: EventResultRow{Place: len(placings) + 1 + better, DecidedBy: EventResultStagePool, Competitor: c},
		})
	}

	slices.SortFunc(results, compareRankedResults)
	rows := make([]EventResultRow, len(results))
	for i, r := range results {
		rows[i] = r.row
	}

	return rows
}

func compareRankedResults(a, b rankedResult) int {
	if a.row.Place != b.row.Place {
		return a.row.Place - b.row.Place
	}
	if a.seed != b.seed {
		return a.seed - b.seed
	}
	if c := strings.Compare(a.row.Competitor.LastName, b.row.Competitor.LastName); c != 0 {
		return c
	}
	if c := strings.Compare(a.row.Competitor.FirstName, b.row.Competitor.FirstName); c != 0 {
		return c
	}

	return strings.Compare(a.row.Competitor.ID.String(), b.row.Competitor.ID.String())
}
