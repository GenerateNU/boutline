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

// Mirrors bout.BoutStatusUpcoming; bout imports this package, so it cannot be referenced here.
const poolBoutStatusUpcoming = "upcoming"

// PoolBout writes the bouts of a new pool. bout imports pool, so bout.Bout cannot be used;
// it is deliberately not registered in cmd/atlasloader.
type PoolBout struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TournamentID     uuid.UUID
	PoolID           uuid.UUID
	PoolOrder        int
	Competitor1ID    uuid.UUID `gorm:"column:competitor_1_id"`
	Competitor2ID    uuid.UUID `gorm:"column:competitor_2_id"`
	Location         *string
	RefereeID        *uuid.UUID
	PointsToWin      int
	TimeLimitSeconds int
	GroupNumber      int
	Status           string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (PoolBout) TableName() string {
	return "bouts"
}

// PoolEntrant is a competitor as seating needs them.
type PoolEntrant struct {
	ID        uuid.UUID
	CreatedAt time.Time
}

// PoolLineup is a pool to create, its fencers in position order and its bouts in pool order.
type PoolLineup struct {
	Pool    Pool
	Fencers []uuid.UUID
	Bouts   []PoolBout
}
