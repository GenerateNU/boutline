package eventresult

import (
	"boutline/internal/features/competitor"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"

	"github.com/google/uuid"
)

type EventResultStage string

const (
	EventResultStagePool              EventResultStage = "pool"
	EventResultStageDirectElimination EventResultStage = "direct_elimination"
)

type EventResultPoolStageRow struct {
	ID     uuid.UUID
	Status poolstage.PoolStageStatus
}

type EventResultDirectEliminationRow struct {
	ID     uuid.UUID
	Status directelimination.DirectEliminationStatus
}

type EventResultCompetitor struct {
	ID          uuid.UUID
	FirstName   string
	LastName    string
	PrimaryClub *string
	Rating      competitor.Rating
}

// A stage that has not ended leaves its fields nil.
type eventResultInputs struct {
	poolBouts    []pool.PoolSheetBoutRow
	entrants     []directelimination.DirectEliminationEntrant
	tableauBouts []directelimination.DirectEliminationBoutScore
}

type EventResultRow struct {
	Place      int
	DecidedBy  EventResultStage
	Competitor EventResultCompetitor
}
