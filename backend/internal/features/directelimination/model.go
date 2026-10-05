package directelimination

import (
	"time"

	"github.com/google/uuid"
)

type Status string

const (
	StatusUpcoming Status = "upcoming"
	StatusActive   Status = "active"
	StatusEnd      Status = "end"
)

func (s Status) IsValid() bool {
	return s == StatusUpcoming ||
		s == StatusActive ||
		s == StatusEnd
}

type DirectElimination struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Status      Status    `gorm:"type:text;not null;index;default:upcoming;check:chk_direct_eliminations_status,status IN ('upcoming','active','end')"`
	EventID     uuid.UUID `gorm:"type:uuid;not null;index"`
	StartedAt   *time.Time
	CompletedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (DirectElimination) TableName() string {
	return "direct_eliminations"
}

func DirectEliminationEditableStatuses() []Status {
	return []Status{StatusUpcoming, StatusActive}
}
