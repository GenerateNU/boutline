package pool

import (
	"time"

	"boutline/internal/features/poolstage"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

type Pool struct {
	ID          uuid.UUID            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	PoolStageID uuid.UUID            `gorm:"type:uuid;not null;index;uniqueIndex:idx_pools_pool_stage_id_number,priority:1"`
	PoolStage   *poolstage.PoolStage `gorm:"foreignKey:PoolStageID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	RefereeID   *uuid.UUID           `gorm:"type:uuid;index"`
	Referee     *user.User           `gorm:"foreignKey:RefereeID;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	Number      int                  `gorm:"not null;uniqueIndex:idx_pools_pool_stage_id_number,priority:2;check:chk_pools_number,number >= 1"`
	Strip       *string              `gorm:"type:text"`
	StartTime   *time.Time
	StartedAt   *time.Time
	CompletedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (Pool) TableName() string {
	return "pools"
}
