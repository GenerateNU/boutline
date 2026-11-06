package athlete

import (
	"time"

	"boutline/internal/features/user"

	"github.com/google/uuid"
)

type Athlete struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	MemberNumber string     `gorm:"type:text;not null;uniqueIndex:idx_athletes_member_number"`
	UserID       *uuid.UUID `gorm:"type:uuid;uniqueIndex:idx_athletes_user_id"`
	User         *user.User `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:SET NULL,OnUpdate:CASCADE"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (Athlete) TableName() string {
	return "athletes"
}
