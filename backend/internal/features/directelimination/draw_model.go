package directelimination

import (
	"time"

	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

// Mirrors bout.BoutStatusUpcoming; bout imports this package, so it cannot be referenced here.
const drawBoutStatusUpcoming = "upcoming"

// LockedDirectElimination is what the draw reads from the direct elimination row it holds locked.
type LockedDirectElimination struct {
	Status           DirectEliminationStatus
	EventID          uuid.UUID
	TournamentID     uuid.UUID
	TournamentStatus tournament.TournamentStatus
}

// DrawEntry and DrawBout exist because bout and tableau import this package, so their
// models cannot be used here; they are deliberately not registered in cmd/atlasloader.
type DrawEntry struct {
	DirectEliminationID uuid.UUID `gorm:"type:uuid;primaryKey"`
	CompetitorID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	Seed                int
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (DrawEntry) TableName() string {
	return "direct_elimination_entries"
}

type DrawBout struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TournamentID        uuid.UUID
	DirectEliminationID uuid.UUID
	RoundSize           int
	Slot                int
	Competitor1ID       uuid.UUID `gorm:"column:competitor_1_id"`
	Competitor2ID       uuid.UUID `gorm:"column:competitor_2_id"`
	PointsToWin         int
	TimeLimitSeconds    int
	GroupNumber         int
	Status              string
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (DrawBout) TableName() string {
	return "bouts"
}
