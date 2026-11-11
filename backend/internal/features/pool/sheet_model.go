package pool

import (
	"time"

	"github.com/google/uuid"
)

type PoolSheetStatus string

const (
	PoolSheetStatusUpcoming PoolSheetStatus = "upcoming"
	PoolSheetStatusActive   PoolSheetStatus = "active"
	PoolSheetStatusEnded    PoolSheetStatus = "ended"
)

type PoolSheetPoolRow struct {
	ID          uuid.UUID
	PoolStageID uuid.UUID
	Number      int
	Strip       *string
	StartTime   *time.Time
	StartedAt   *time.Time
	CompletedAt *time.Time
}

func (p PoolSheetPoolRow) Status() PoolSheetStatus {
	switch {
	case p.CompletedAt != nil:
		return PoolSheetStatusEnded
	case p.StartedAt != nil:
		return PoolSheetStatusActive
	default:
		return PoolSheetStatusUpcoming
	}
}

// PoolSheetFencerRow is one fencer as a pool's sheet shows them: name, team and
// grid position. It is read from the pool's bouts and the competitors table, not
// stored anywhere of its own.
type PoolSheetFencerRow struct {
	PoolID       uuid.UUID
	CompetitorID uuid.UUID
	Position     int
	FirstName    string
	LastName     string
	Team         string
}

// PoolSheetBoutRow is a read-only view of one bout in the bouts table, with each
// side's score summed from its scorings. The sheet query scans into a slice of
// these, like a SQL view, so it is not a second copy of the bout. It exists
// because bout imports pool and scoring imports bout, so pool can't use their types.
type PoolSheetBoutRow struct {
	ID               uuid.UUID
	PoolID           uuid.UUID
	Slot             int
	Status           string
	Competitor1ID    uuid.UUID `gorm:"column:competitor_1_id"`
	Competitor2ID    uuid.UUID `gorm:"column:competitor_2_id"`
	Competitor1Score int       `gorm:"column:competitor_1_score"`
	Competitor2Score int       `gorm:"column:competitor_2_score"`
	Location         *string
	StartTime        *time.Time
}
