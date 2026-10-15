package pool

import (
	"time"

	"boutline/internal/features/poolstage"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

type Pool struct {
	ID          uuid.UUID            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	PoolStageID uuid.UUID            `gorm:"type:uuid;not null;index"`
	PoolStage   *poolstage.PoolStage `gorm:"foreignKey:PoolStageID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	RefereeID   *uuid.UUID           `gorm:"type:uuid;index"`
	Referee     *user.User           `gorm:"foreignKey:RefereeID;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	StartedAt   *time.Time
	CompletedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (Pool) TableName() string {
	return "pools"
}
