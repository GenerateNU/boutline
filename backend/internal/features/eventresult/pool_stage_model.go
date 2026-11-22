package eventresult

import (
	"boutline/internal/features/pool"

	"github.com/google/uuid"
)

type PoolStageResultStatus string

const (
	PoolStageResultStatusPending    PoolStageResultStatus = "pending"
	PoolStageResultStatusAdvanced   PoolStageResultStatus = "advanced"
	PoolStageResultStatusEliminated PoolStageResultStatus = "eliminated"
)

// PoolStageResultFencer is read from the pool stage's bouts and the competitors
// table, not stored anywhere of its own.
type PoolStageResultFencer struct {
	CompetitorID uuid.UUID
	FirstName    string
	LastName     string
	Club         *string
	PoolNumber   int
}

type PoolStageResultRow struct {
	Fencer   PoolStageResultFencer
	Standing pool.PoolStanding
	Status   PoolStageResultStatus
}
