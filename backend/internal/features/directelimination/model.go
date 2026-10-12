package directelimination

import (
	"time"

	"github.com/google/uuid"
)

type DirectEliminationStatus string

const (
	DirectEliminationStatusUpcoming DirectEliminationStatus = "upcoming"
	DirectEliminationStatusActive   DirectEliminationStatus = "active"
	DirectEliminationStatusEnded    DirectEliminationStatus = "ended"
)

func (s DirectEliminationStatus) IsValid() bool {
	return s == DirectEliminationStatusUpcoming ||
		s == DirectEliminationStatusActive ||
		s == DirectEliminationStatusEnded
}

type DirectElimination struct {
	ID          uuid.UUID               `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Status      DirectEliminationStatus `gorm:"type:text;not null;index;default:upcoming;check:chk_direct_eliminations_status,status IN ('upcoming','active','ended')"`
	EventID     uuid.UUID               `gorm:"type:uuid;not null;index"`
	StartedAt   *time.Time
	CompletedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (DirectElimination) TableName() string {
	return "direct_eliminations"
}

func DirectEliminationEditableStatuses() []DirectEliminationStatus {
	return []DirectEliminationStatus{DirectEliminationStatusUpcoming, DirectEliminationStatusActive}
}
