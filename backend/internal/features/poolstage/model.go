package poolstage

import (
	"time"

	"boutline/internal/features/competitor"
	"boutline/internal/features/event"

	"github.com/google/uuid"
)

// A pool stage keeps its own status alongside the event's so that, once it
// ends, the event can move on to direct elimination while staying active.
type PoolStageStatus string

const (
	PoolStageStatusUpcoming PoolStageStatus = "upcoming"
	PoolStageStatusActive   PoolStageStatus = "active"
	PoolStageStatusEnded    PoolStageStatus = "ended"
)

func (s PoolStageStatus) IsValid() bool {
	return s == PoolStageStatusUpcoming ||
		s == PoolStageStatusActive ||
		s == PoolStageStatusEnded
}

func PoolStageEditableStatuses() []PoolStageStatus {
	return []PoolStageStatus{PoolStageStatusUpcoming}
}

func PoolStageDeletableStatuses() []PoolStageStatus {
	return []PoolStageStatus{PoolStageStatusUpcoming}
}

type PoolStage struct {
	ID                   uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	EventID              uuid.UUID       `gorm:"type:uuid;not null;index"`
	Event                *event.Event    `gorm:"foreignKey:EventID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	MaxCompetitorPerPool int             `gorm:"not null;check:chk_pool_stages_max_competitor_per_pool,max_competitor_per_pool >= 2"`
	Status               PoolStageStatus `gorm:"type:text;not null;default:upcoming;check:chk_pool_stages_status,status IN ('upcoming','active','ended')"`
	StartTime            *time.Time
	StartedAt            *time.Time
	CompletedAt          *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

func (PoolStage) TableName() string {
	return "pool_stages"
}

// PoolStageEntrant is a competitor as a pool proposal needs them.
type PoolStageEntrant struct {
	ID           uuid.UUID
	TournamentID *uuid.UUID
	FirstName    string
	LastName     string
	Rating       competitor.Rating
	Team         string
}
