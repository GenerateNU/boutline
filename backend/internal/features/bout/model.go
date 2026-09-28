package bout

import (
	"time"

	"boutline/internal/features/tournament"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

type BoutStatus string

const (
	BoutStatusUpcoming BoutStatus = "upcoming"
	BoutStatusActive   BoutStatus = "active"
	BoutStatusEnd      BoutStatus = "end"
)

func (s BoutStatus) IsValid() bool {
	return s == BoutStatusUpcoming ||
		s == BoutStatusActive ||
		s == BoutStatusEnd
}

// Two competitor columns hard-code the number of sides into the table. That is
// knowingly worse than a join table, but every bout here has exactly two.
type Bout struct {
	ID               uuid.UUID              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TournamentID     uuid.UUID              `gorm:"type:uuid;not null;index"`
	Tournament       *tournament.Tournament `gorm:"foreignKey:TournamentID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	Location         *string                `gorm:"type:text"`
	StartTime        *time.Time
	StartedAt        *time.Time
	CompletedAt      *time.Time
	RefereeID        *uuid.UUID `gorm:"type:uuid;index"`
	Referee          *user.User `gorm:"foreignKey:RefereeID;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	TimeLimitSeconds *int       `gorm:"check:chk_bouts_time_limit_seconds,time_limit_seconds > 0"`
	PointsToWin      int        `gorm:"not null;check:chk_bouts_points_to_win,points_to_win > 0"`
	GroupNumber      int        `gorm:"not null;default:0;check:chk_bouts_group_number,group_number >= 0"`
	Status           BoutStatus `gorm:"type:text;not null;index;default:upcoming;check:chk_bouts_status,status IN ('upcoming','active','end')"`
	// The competitors table has not been merged yet, so these columns have no
	// foreign key or Competitor association; add both in the migration that
	// creates that table.
	Competitor1ID uuid.UUID `gorm:"column:competitor_1_id;type:uuid;not null;index:idx_bouts_competitor_1_id"`
	Competitor2ID uuid.UUID `gorm:"column:competitor_2_id;type:uuid;not null;index:idx_bouts_competitor_2_id;check:chk_bouts_distinct_competitors,competitor_1_id <> competitor_2_id"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (Bout) TableName() string {
	return "bouts"
}

func BoutEditableStatuses() []BoutStatus {
	return []BoutStatus{BoutStatusUpcoming}
}

func BoutDeletableStatuses() []BoutStatus {
	return []BoutStatus{BoutStatusUpcoming, BoutStatusEnd}
}
