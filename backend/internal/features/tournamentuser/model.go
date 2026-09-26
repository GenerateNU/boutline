package tournamentuser

import (
	"time"

	"boutline/internal/features/tournament"
	"boutline/internal/features/user"

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

type TournamentUser struct {
	UserID       uuid.UUID              `gorm:"type:uuid;primaryKey"`
	TournamentID uuid.UUID              `gorm:"type:uuid;primaryKey;index"`
	Role         TournamentUserRole     `gorm:"type:text;not null;check:chk_tournament_users_role,role IN ('referee','admin')"`
	User         *user.User             `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	Tournament   *tournament.Tournament `gorm:"foreignKey:TournamentID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (TournamentUser) TableName() string {
	return "tournament_users"
}
