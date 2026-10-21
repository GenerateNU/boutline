package scoring

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ScoringRepository interface {
	CreateScoring(ctx context.Context, scoring *Scoring) error
	GetScoringByID(ctx context.Context, id int64) (*Scoring, error)
	ListScoring(ctx context.Context, filter ScoringListFilter) ([]Scoring, int64, error)
	UpdateScoring(ctx context.Context, scoring *Scoring) error
	RevokeScoring(ctx context.Context, scoring *Scoring) error
	ListScoringHistory(ctx context.Context, boutID uuid.UUID) ([]Scoring, error)
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
		return utils.TranslateWriteError("create scoring", Scoring{}.TableName(),
			"created_by, competitor_id and bout_id must reference existing rows", err)
	}

	return nil
}

func (r *scoringRepository) GetScoringByID(ctx context.Context, id int64) (*Scoring, error) {
	var scoring Scoring

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&scoring).Error
	if err != nil {
		return nil, utils.TranslateReadError(fmt.Sprintf("select scoring %d", id), err)
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
		return utils.TranslateWriteError(fmt.Sprintf("update scoring %d", scoring.ID), Scoring{}.TableName(),
			"competitor_id must reference an existing row", result.Error)
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
		return utils.TranslateWriteError(fmt.Sprintf("update scoring %d", scoring.ID), Scoring{}.TableName(),
			"revoked_by must reference an existing row", result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetScoringByID(ctx, scoring.ID); err != nil {
			return err
		}
		return fmt.Errorf("update scoring %d: %w", scoring.ID, errs.ErrConflict)
	}

	return nil
}

func (r *scoringRepository) ListScoringHistory(ctx context.Context, boutID uuid.UUID) ([]Scoring, error) {
	scores := []Scoring{}
	err := r.db.WithContext(ctx).
		Select("id", "competitor_id", "points", "created_at", "revoked_at").
		Where("bout_id = ?", boutID).
		Order("created_at DESC NULLS LAST, id DESC").
		Find(&scores).Error
	if err != nil {
		return nil, fmt.Errorf("select scoring history for match %s: %w", boutID, err)
	}

	return scores, nil
}
