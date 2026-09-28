package event

import (
	"time"

	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

type EventType string

const (
	EventTypePool              EventType = "pool"
	EventTypeDirectElimination EventType = "direct_elimination"
)

type EventStatus string

const (
	EventStatusUpcoming EventStatus = "upcoming"
	EventStatusActive   EventStatus = "active"
	EventStatusEnded    EventStatus = "ended"
)

type Event struct {
	ID           uuid.UUID              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TournamentID uuid.UUID              `gorm:"type:uuid;not null;index"`
	Tournament   *tournament.Tournament `gorm:"foreignKey:TournamentID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	EventType    EventType              `gorm:"type:text;not null;check:chk_events_event_type,event_type IN ('pool','direct_elimination')"`
	Name         string                 `gorm:"type:text;not null"`
	Status       EventStatus            `gorm:"type:text;not null;index;default:upcoming;check:chk_events_status,status IN ('upcoming','active','ended')"`
	StartTime    *time.Time
	StartedAt    *time.Time
	CompletedAt  *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (Event) TableName() string {
	return "events"
}
