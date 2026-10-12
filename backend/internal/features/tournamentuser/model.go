package tournamentuser

import (
	"time"

	"github.com/google/uuid"
)

type TournamentUserRole string

const (
	TournamentUserRoleReferee TournamentUserRole = "referee"
	TournamentUserRoleAdmin   TournamentUserRole = "admin"
)

func (r TournamentUserRole) IsValid() bool {
	return r == TournamentUserRoleReferee || r == TournamentUserRoleAdmin
}

// Both foreign keys are declared from the owning sides (tournament.Tournament
// and user.User) rather than here, which keeps this package free of feature
// imports so that both of them can depend on it.
type TournamentUser struct {
	UserID       uuid.UUID          `gorm:"type:uuid;primaryKey"`
	TournamentID uuid.UUID          `gorm:"type:uuid;primaryKey;index"`
	Role         TournamentUserRole `gorm:"type:text;not null;check:chk_tournament_users_role,role IN ('referee','admin')"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (TournamentUser) TableName() string {
	return "tournament_users"
}
