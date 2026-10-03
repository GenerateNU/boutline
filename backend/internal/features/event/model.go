package event

import (
	"time"

	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

// Format never changes after creation and decides the order of the event's
// stages. The current stage is whichever stage row is active, so it isn't
// stored on the event.
type EventFormat string

const (
	EventFormatPoolThenDirectElimination EventFormat = "pool_then_direct_elimination"
)

type EventStatus string

const (
	EventStatusUpcoming EventStatus = "upcoming"
	EventStatusActive   EventStatus = "active"
	EventStatusEnded    EventStatus = "ended"
)

func (s EventStatus) IsValid() bool {
	return s == EventStatusUpcoming ||
		s == EventStatusActive ||
		s == EventStatusEnded
}

func EventEditableStatuses() []EventStatus {
	return []EventStatus{EventStatusUpcoming}
}

func EventDeletableStatuses() []EventStatus {
	return []EventStatus{EventStatusUpcoming}
}

type Event struct {
	ID           uuid.UUID              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TournamentID uuid.UUID              `gorm:"type:uuid;not null;index"`
	Tournament   *tournament.Tournament `gorm:"foreignKey:TournamentID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	Format       EventFormat            `gorm:"type:text;not null;default:pool_then_direct_elimination;check:chk_events_format,format IN ('pool_then_direct_elimination')"`
	Name         string                 `gorm:"type:text;not null"`
	Status       EventStatus            `gorm:"type:text;not null;default:upcoming;check:chk_events_status,status IN ('upcoming','active','ended')"`
	StartTime    *time.Time
	StartedAt    *time.Time
	CompletedAt  *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (Event) TableName() string {
	return "events"
}
