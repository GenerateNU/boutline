package pool

import (
	"time"

	"github.com/google/uuid"
)

type PoolBoardStatus string

const (
	PoolBoardStatusUpcoming PoolBoardStatus = "upcoming"
	PoolBoardStatusActive   PoolBoardStatus = "active"
	PoolBoardStatusEnded    PoolBoardStatus = "ended"
)

type PoolBoardPoolRow struct {
	ID          uuid.UUID
	PoolStageID uuid.UUID
	Number      int
	Strip       *string
	StartTime   *time.Time
	StartedAt   *time.Time
	CompletedAt *time.Time
}

func (p PoolBoardPoolRow) Status() PoolBoardStatus {
	switch {
	case p.CompletedAt != nil:
		return PoolBoardStatusEnded
	case p.StartedAt != nil:
		return PoolBoardStatusActive
	default:
		return PoolBoardStatusUpcoming
	}
}

type PoolBoardFencerRow struct {
	PoolID       uuid.UUID
	CompetitorID uuid.UUID
	Position     int
	FirstName    string
	LastName     string
	Team         string
}

type PoolBoardBoutRow struct {
	ID               uuid.UUID
	PoolID           uuid.UUID
	Status           string
	Competitor1ID    uuid.UUID `gorm:"column:competitor_1_id"`
	Competitor2ID    uuid.UUID `gorm:"column:competitor_2_id"`
	Competitor1Score int       `gorm:"column:competitor_1_score"`
	Competitor2Score int       `gorm:"column:competitor_2_score"`
	Location         *string
	StartTime        *time.Time
}
