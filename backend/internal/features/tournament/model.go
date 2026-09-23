package tournament

import (
	"time"

	"boutline/internal/features/user"

	"github.com/google/uuid"
)

type TournamentStatus string

const (
	TournamentStatusPending TournamentStatus = "pending"
	TournamentStatusActive  TournamentStatus = "active"
	TournamentStatusEnd     TournamentStatus = "end"
)

func (s TournamentStatus) IsValid() bool {
	return s == TournamentStatusPending ||
		s == TournamentStatusActive ||
		s == TournamentStatusEnd
}

type TournamentVisibility string

const (
	TournamentVisibilityPrivate TournamentVisibility = "private"
	TournamentVisibilityPublic  TournamentVisibility = "public"
)

// Deletion is left out on purpose, and it is under consideration. If we
// choose to implement it, deleted_at is a cheap migration.
type Tournament struct {
	ID          uuid.UUID            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string               `gorm:"type:text;not null"`
	Visibility  TournamentVisibility `gorm:"type:text;not null;check:chk_tournaments_visibility,visibility IN ('private','public')"`
	Code        string               `gorm:"type:text;not null;uniqueIndex:idx_tournaments_code"`
	Status      TournamentStatus     `gorm:"type:text;not null;index;default:pending;check:chk_tournaments_status,status IN ('pending','active','end')"`
	CreatedBy   uuid.UUID            `gorm:"type:uuid;not null;index"`
	Creator     *user.User           `gorm:"foreignKey:CreatedBy;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	StartTime   *time.Time
	StartedAt   *time.Time
	CompletedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (v TournamentVisibility) IsValid() bool {
	return v == TournamentVisibilityPrivate || v == TournamentVisibilityPublic
}

func (Tournament) TableName() string {
	return "tournaments"
}

func TournamentEditableStatuses() []TournamentStatus {
	return []TournamentStatus{TournamentStatusPending, TournamentStatusActive}
}
