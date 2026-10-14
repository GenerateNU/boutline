package scoring

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ScoringRepository interface {
	CreateScoring(ctx context.Context, scoring *Scoring) error
	GetScoringByID(ctx context.Context, id int64) (*Scoring, error)
	ListScoring(ctx context.Context, filter ScoringListFilter) ([]Scoring, int64, error)
	UpdateScoring(ctx context.Context, scoring *Scoring) error
	RevokeScoring(ctx context.Context, scoring *Scoring) error
	ListScoringHistory(ctx context.Context, filter ScoringHistoryFilter) (ScoringHistoryPage, error)
}

type ScoringListFilter struct {
	BoutID         *uuid.UUID
	IncludeRevoked bool
	Limit          int
	Offset         int
}

type ScoringHistoryFilter struct {
	BoutID uuid.UUID
	Limit  int
	Offset int
}

type ScoringHistoryPage struct {
	Scores       []Scoring         // live and revoked, newest first
	Total        int64             // live and revoked scores for the bout, ignoring the page
	PointsBefore map[uuid.UUID]int // live points per competitor older than the page
}

type competitorPoints struct {
	CompetitorID uuid.UUID
	Points       int
}

type scoringRepository struct {
	db *gorm.DB
}

func NewScoringRepository(db *gorm.DB) ScoringRepository {
	return &scoringRepository{db: db}
}

func (r *scoringRepository) CreateScoring(ctx context.Context, scoring *Scoring) error {
	if err := r.db.WithContext(ctx).Create(scoring).Error; err != nil {
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("create scoring: %w",
				errs.Public("created_by, competitor_id and bout_id must reference existing rows", errs.ErrInvalidInput))
		}
		return fmt.Errorf("create scoring: %w", err)
	}

	return nil
}

func (r *scoringRepository) GetScoringByID(ctx context.Context, id int64) (*Scoring, error) {
	var scoring Scoring

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&scoring).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select scoring %d: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select scoring %d: %w", id, err)
	}

	return &scoring, nil
}

func (r *scoringRepository) ListScoring(ctx context.Context, filter ScoringListFilter) ([]Scoring, int64, error) {
	query := r.db.WithContext(ctx).Model(&Scoring{}).Where("bout_id = ?", filter.BoutID)
	if !filter.IncludeRevoked {
		query = query.Where("revoked_at IS NULL")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count scoring for match %s: %w", filter.BoutID, err)
	}

	scores := make([]Scoring, 0, filter.Limit)
	err := query.
		Order("created_at DESC, id ASC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&scores).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select scoring for match %s: %w", filter.BoutID, err)
	}

	return scores, total, nil
}

func (r *scoringRepository) UpdateScoring(ctx context.Context, scoring *Scoring) error {
	result := r.db.WithContext(ctx).
		Model(&Scoring{}).
		Where("id = ? AND revoked_at IS NULL", scoring.ID).
		Select("points", "competitor_id").
		Updates(scoring)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("update scoring %d: %w",
				scoring.ID, errs.Public("competitor_id must reference an existing row", errs.ErrInvalidInput))
		}
		return fmt.Errorf("update scoring %d: %w", scoring.ID, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetScoringByID(ctx, scoring.ID); err != nil {
			return err
		}
		return fmt.Errorf("update scoring %d: %w", scoring.ID, errs.ErrConflict)
	}

	return nil
}

func (r *scoringRepository) RevokeScoring(ctx context.Context, scoring *Scoring) error {
	result := r.db.WithContext(ctx).
		Model(&Scoring{}).
		Where("id = ? AND revoked_at IS NULL", scoring.ID).
		Select("revoked_at", "revoked_by").
		Updates(scoring)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("update scoring %d: %w",
				scoring.ID, errs.Public("revoked_by must reference an existing row", errs.ErrInvalidInput))
		}
		return fmt.Errorf("update scoring %d: %w", scoring.ID, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetScoringByID(ctx, scoring.ID); err != nil {
			return err
		}
		return fmt.Errorf("update scoring %d: %w", scoring.ID, errs.ErrConflict)
	}

	return nil
}

func (r *scoringRepository) ListScoringHistory(
	ctx context.Context,
	filter ScoringHistoryFilter,
) (ScoringHistoryPage, error) {
	page := ScoringHistoryPage{
		Scores:       make([]Scoring, 0, filter.Limit),
		PointsBefore: map[uuid.UUID]int{},
	}

	forBout := func(tx *gorm.DB) *gorm.DB {
		return tx.Model(&Scoring{}).Where("bout_id = ?", filter.BoutID)
	}
	live := func(tx *gorm.DB) *gorm.DB {
		return forBout(tx).Where("revoked_at IS NULL")
	}

	// One snapshot so the page, the count and the earlier totals agree while touches are being written.
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := forBout(tx).Count(&page.Total).Error; err != nil {
			return fmt.Errorf("count scoring history for match %s: %w", filter.BoutID, err)
		}

		err := forBout(tx).
			Select("id", "competitor_id", "points", "created_at", "revoked_at").
			Order("id DESC").
			Limit(filter.Limit).
			Offset(filter.Offset).
			Find(&page.Scores).Error
		if err != nil {
			return fmt.Errorf("select scoring history for match %s: %w", filter.BoutID, err)
		}
		if len(page.Scores) == 0 {
			return nil
		}

		oldestID := page.Scores[len(page.Scores)-1].ID
		var earlier []competitorPoints
		err = live(tx).
			Select("competitor_id, SUM(points) AS points").
			Where("id < ?", oldestID).
			Group("competitor_id").
			Scan(&earlier).Error
		if err != nil {
			return fmt.Errorf("sum earlier scoring for match %s: %w", filter.BoutID, err)
		}
		for _, row := range earlier {
			page.PointsBefore[row.CompetitorID] = row.Points
		}

		return nil
	}, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return ScoringHistoryPage{}, err
	}

	return page, nil
}
