package scoring

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"gorm.io/gorm"
)

type ScoringRepository interface {
	CreateScoring(ctx context.Context, scoring *Scoring) error
	GetScoringByID(ctx context.Context, id int64) (*Scoring, error)
	ListScoring(ctx context.Context, filter ScoringListFilter) ([]Scoring, error)
	UpdateScoring(ctx context.Context, scoring *Scoring) error
}

type ScoringListFilter struct {
	MatchID        uuid.UUID
	IncludeRevoked bool
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
				errs.Public("created_by, competitor_id and match_id must reference existing rows", errs.ErrInvalidInput))
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
	query := r.db.WithContext(ctx).Where("match_id = ?", filter.MatchID)
	if !filter.IncludeRevoked {
		query = query.Where("revoked_at IS NULL")
	}

	var scores []Scoring
	err := query.Order("created_at ASC, id ASC").Find(&scores).Error
	if err != nil {
		return nil, fmt.Errorf("select scoring for match %s: %w", filter.MatchID, err)
	}

	return scores, nil
}

func (r *scoringRepository) UpdateScoring(ctx context.Context, scoring *Scoring) error {
	result := r.db.WithContext(ctx).
		Model(&Scoring{}).
		Where("id = ? AND revoked_at IS NULL", scoring.ID).
		Select("points", "competitor_id", "revoked_at", "revoked_by").
		Updates(scoring)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("update scoring %d: %w",
				scoring.ID, errs.Public("competitor_id or revoked_by must reference an existing row", errs.ErrInvalidInput))
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

func (s *scoringService) RevokeScoring(
	ctx context.Context,
	input *ScoringRevokeInput,
) (*ScoringOutput, error) {
	// TODO: take revoked_by from the logged-in user in ctx once auth is wired up.
	revokedBy, err := utils.ParseUUID(input.Body.RevokedBy, "revoked_by")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	scoring, err := s.repo.GetScoringByID(ctx, input.ID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get scoring: %w", err))
	}

	if scoring.RevokedAt != nil {
		return nil, errs.HumaError(errs.Public("score has already been revoked", errs.ErrConflict))
	}

	now := time.Now()
	scoring.RevokedAt = &now
	scoring.RevokedBy = &revokedBy

	if err := s.repo.UpdateScoring(ctx, scoring); err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(errs.Public("score has already been revoked", errs.ErrConflict))
		}
		return nil, errs.HumaError(fmt.Errorf("revoke scoring: %w", err))
	}

	return &ScoringOutput{Body: newScoringResponse(*scoring)}, nil
}