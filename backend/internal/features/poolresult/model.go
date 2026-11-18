package poolresult

import (
	"boutline/internal/features/pool"

	"github.com/google/uuid"
)

type PoolResultStatus string

const (
	PoolResultStatusPending    PoolResultStatus = "pending"
	PoolResultStatusAdvanced   PoolResultStatus = "advanced"
	PoolResultStatusEliminated PoolResultStatus = "eliminated"
)

// PoolResultFencer is read from the pool stage's bouts and the competitors table,
// not stored anywhere of its own.
type PoolResultFencer struct {
	CompetitorID uuid.UUID
	FirstName    string
	LastName     string
	Club         *string
	PoolNumber   int
}

type PoolResultRow struct {
	Fencer   PoolResultFencer
	Standing pool.PoolStanding
	Status   PoolResultStatus
}
