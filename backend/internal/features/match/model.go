package match

import (
	"time"

	"boutline/internal/features/tournament"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

type MatchStatus string

const (
	MatchStatusPending MatchStatus = "pending"
	MatchStatusActive  MatchStatus = "active"
	MatchStatusEnd     MatchStatus = "end"
)

func (s MatchStatus) IsValid() bool {
	return s == MatchStatusPending ||
		s == MatchStatusActive ||
		s == MatchStatusEnd
}

// Two competitor columns hard-code the number of sides into the table. That is
// knowingly worse than a join table, but every match here has exactly two.
// The competitor columns have no foreign key yet because there is no
// competitors table; add one in the migration that creates it.
type Match struct {
	ID               uuid.UUID              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TournamentID     uuid.UUID              `gorm:"type:uuid;not null;index"`
	Tournament       *tournament.Tournament `gorm:"foreignKey:TournamentID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	Location         *string                `gorm:"type:text"`
	Time             *time.Time
	RefereeID        uuid.UUID   `gorm:"type:uuid;not null;index"`
	Referee          *user.User  `gorm:"foreignKey:RefereeID;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	TimeLimitSeconds *int        `gorm:"check:chk_matches_time_limit_seconds,time_limit_seconds > 0"`
	PointsToWin      int         `gorm:"not null;check:chk_matches_points_to_win,points_to_win > 0"`
	GroupNumber      int         `gorm:"not null;default:0;check:chk_matches_group_number,group_number >= 0"`
	Status           MatchStatus `gorm:"type:text;not null;index;default:pending;check:chk_matches_status,status IN ('pending','active','end')"`
	Competitor1ID    uuid.UUID   `gorm:"column:competitor_1_id;type:uuid;not null;index:idx_matches_competitor_1_id"`
	Competitor2ID    uuid.UUID   `gorm:"column:competitor_2_id;type:uuid;not null;index:idx_matches_competitor_2_id;check:chk_matches_distinct_competitors,competitor_1_id <> competitor_2_id"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (Match) TableName() string {
	return "matches"
}

func MatchEditableStatuses() []MatchStatus {
	return []MatchStatus{MatchStatusPending}
}

func MatchDeletableStatuses() []MatchStatus {
	return []MatchStatus{MatchStatusPending, MatchStatusEnd}
}
