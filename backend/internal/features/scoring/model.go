package scoring

import (
	"time"

	"boutline/internal/features/user"

	"github.com/google/uuid"
)

type Scoring struct {
	ID           int64      `gorm:"primaryKey;autoIncrement"`
	CreatedBy    uuid.UUID  `gorm:"type:uuid;not null;index"`
	Creator      *user.User `gorm:"foreignKey:CreatedBy;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	Points       int        `gorm:"not null;default:1;check:chk_scorings_points,points >= 1"`
	CompetitorID uuid.UUID  `gorm:"type:uuid;not null;index"`
	MatchID      uuid.UUID  `gorm:"type:uuid;not null;index"`
	RevokedAt    *time.Time
	RevokedBy    *uuid.UUID `gorm:"type:uuid"`
	Revoker      *user.User `gorm:"foreignKey:RevokedBy;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (Scoring) TableName() string {
	return "scorings"
}