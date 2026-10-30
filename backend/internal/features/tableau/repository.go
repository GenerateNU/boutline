package tableau

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/bout"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TableauRepository interface {
	GetLatestTableau(ctx context.Context, eventID uuid.UUID) (*TableauRow, error)
	ListTableauBouts(ctx context.Context, directEliminationID uuid.UUID) ([]BoutRow, error)
	SumBoutScores(ctx context.Context, boutIDs []uuid.UUID) ([]ScoreRow, error)
}

type TableauRow struct {
	ID         uuid.UUID `gorm:"column:id"`
	EntryCount int       `gorm:"column:entry_count"`
}

// Seeds are pointers because they come from a LEFT JOIN: a nil seed means the
// fencer has no entry row, which the service treats as corrupt data.
type BoutRow struct {
	ID          uuid.UUID       `gorm:"column:id"`
	RoundSize   int             `gorm:"column:round_size"`
	Slot        int             `gorm:"column:slot"`
	Status      bout.BoutStatus `gorm:"column:status"`
	TopID       uuid.UUID       `gorm:"column:top_id"`
	TopFirst    string          `gorm:"column:top_first_name"`
	TopLast     string          `gorm:"column:top_last_name"`
	TopClub     string          `gorm:"column:top_club"`
	TopSeed     *int            `gorm:"column:top_seed"`
	BottomID    uuid.UUID       `gorm:"column:bottom_id"`
	BottomFirst string          `gorm:"column:bottom_first_name"`
	BottomLast  string          `gorm:"column:bottom_last_name"`
	BottomClub  string          `gorm:"column:bottom_club"`
	BottomSeed  *int            `gorm:"column:bottom_seed"`
}

type ScoreRow struct {
	BoutID       uuid.UUID `gorm:"column:bout_id"`
	CompetitorID uuid.UUID `gorm:"column:competitor_id"`
	Points       int       `gorm:"column:points"`
}

type tableauRepository struct {
	db *gorm.DB
}

func NewTableauRepository(db *gorm.DB) TableauRepository {
	return &tableauRepository{db: db}
}

// The entry count rides along on the lookup so an undrawn-looking tableau
// (entries but no bouts yet) still knows its size without a fourth query.
func (r *tableauRepository) GetLatestTableau(ctx context.Context, eventID uuid.UUID) (*TableauRow, error) {
	var row TableauRow

	result := r.db.WithContext(ctx).
		Table("direct_eliminations AS de").
		Select("de.id, (SELECT COUNT(*) FROM direct_elimination_entries e WHERE e.direct_elimination_id = de.id) AS entry_count").
		Where("de.event_id = ?", eventID).
		Order("de.created_at DESC").
		Limit(1).
		Scan(&row)
	if result.Error != nil {
		return nil, fmt.Errorf("select direct elimination for event %s: %w", eventID, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, fmt.Errorf("select direct elimination for event %s: %w", eventID, errs.ErrNotFound)
	}

	return &row, nil
}

func (r *tableauRepository) ListTableauBouts(ctx context.Context, directEliminationID uuid.UUID) ([]BoutRow, error) {
	var rows []BoutRow

	err := r.db.WithContext(ctx).
		Table("bouts AS b").
		Select(`b.id, b.round_size, b.slot, b.status,
			c1.id AS top_id, c1.first_name AS top_first_name, c1.last_name AS top_last_name, c1.team AS top_club, e1.seed AS top_seed,
			c2.id AS bottom_id, c2.first_name AS bottom_first_name, c2.last_name AS bottom_last_name, c2.team AS bottom_club, e2.seed AS bottom_seed`).
		Joins("JOIN competitors c1 ON c1.id = b.competitor_1_id").
		Joins("JOIN competitors c2 ON c2.id = b.competitor_2_id").
		Joins("LEFT JOIN direct_elimination_entries e1 ON e1.direct_elimination_id = b.direct_elimination_id AND e1.competitor_id = b.competitor_1_id").
		Joins("LEFT JOIN direct_elimination_entries e2 ON e2.direct_elimination_id = b.direct_elimination_id AND e2.competitor_id = b.competitor_2_id").
		Where("b.direct_elimination_id = ?", directEliminationID).
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("select bouts for direct elimination %s: %w", directEliminationID, err)
	}

	return rows, nil
}

func (r *tableauRepository) SumBoutScores(ctx context.Context, boutIDs []uuid.UUID) ([]ScoreRow, error) {
	var rows []ScoreRow

	err := r.db.WithContext(ctx).
		Table("scorings").
		Select("bout_id, competitor_id, SUM(points) AS points").
		Where("bout_id IN ? AND revoked_at IS NULL", boutIDs).
		Group("bout_id, competitor_id").
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("sum scorings for %d bouts: %w", len(boutIDs), err)
	}

	return rows, nil
}
