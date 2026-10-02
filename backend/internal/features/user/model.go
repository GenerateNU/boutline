package user

import (
	"time"

	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

// Password holds a bcrypt hash, never the plaintext the client sent.
type User struct {
	ID                 uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email              string    `gorm:"type:text;not null;uniqueIndex:idx_users_email"`
	Password           string    `gorm:"type:text;not null"`
	FirstName          string    `gorm:"type:text;not null"`
	LastName           string    `gorm:"type:text;not null"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
	CreatedTournaments []tournament.Tournament     `gorm:"foreignKey:CreatedBy;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	Memberships        []tournament.TournamentUser `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
}

func (User) TableName() string {
	return "users"
}
