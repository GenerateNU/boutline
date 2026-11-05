package tableau

import (
	"time"

	"boutline/internal/features/competitor"
	"boutline/internal/features/directelimination"

	"github.com/google/uuid"
)

// TableauEntry is one fencer's place in one tableau. Seed belongs to the fencer
// for the whole tableau, so it lives here rather than on each of their bouts.
type TableauEntry struct {
	DirectEliminationID uuid.UUID                            `gorm:"type:uuid;primaryKey;uniqueIndex:idx_direct_elimination_entries_seed"`
	DirectElimination   *directelimination.DirectElimination `gorm:"foreignKey:DirectEliminationID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	// RESTRICT rather than CASCADE so removing a competitor cannot silently
	// empty a tableau slot.
	CompetitorID uuid.UUID              `gorm:"type:uuid;primaryKey"`
	Competitor   *competitor.Competitor `gorm:"foreignKey:CompetitorID;references:ID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	Seed         int                    `gorm:"not null;uniqueIndex:idx_direct_elimination_entries_seed;check:chk_direct_elimination_entries_seed,seed >= 1"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (TableauEntry) TableName() string {
	return "direct_elimination_entries"
}
