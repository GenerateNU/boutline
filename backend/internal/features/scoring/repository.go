package scoring

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ScoringRepository interface {
	CreateScoring(ctx context.Context, scoring *Scoring) error
	GetScoringByID(ctx context.Context, id int64) (*Scoring, error)
	ListScoring(ctx context.Context, filter ScoringListFilter) ([]Scoring, error)
	UpdateScoring(ctx context.Context, scoring *Scoring) error
	RevokeScoring(ctx context.Context, scoring *Scoring) error
}

type ScoringListFilter struct {
	BoutID         *uuid.UUID
	IncludeRevoked bool
	Limit          int
	Offset         int
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

func (r *scoringRepository) ListScoring(ctx context.Context, filter ScoringListFilter) ([]Scoring, error) {
	query := r.db.WithContext(ctx).Where("bout_id = ?", filter.BoutID)
	if !filter.IncludeRevoked {
		query = query.Where("revoked_at IS NULL")
	}

	var scores []Scoring
	err := query.Order("created_at ASC, id ASC").Find(&scores).Error
	if err != nil {
		return nil, fmt.Errorf("select scoring for match %s: %w", filter.BoutID, err)
	}

	return scores, nil
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
