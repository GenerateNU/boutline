package scoring

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/utils"
)

const (
	ScoringMinPageSize     = 1
	ScoringDefaultPageSize = 20
	ScoringMaxPageSize     = 100
)

type ScoringService interface {
	CreateScoring(ctx context.Context, input *ScoringCreateInput) (*ScoringOutput, error)
	GetScoringByID(ctx context.Context, input *ScoringIDInput) (*ScoringOutput, error)
	RevokeScoring(ctx context.Context, input *ScoringRevokeInput) (*ScoringOutput, error)
	ListScoring(ctx context.Context, input *ScoringListInput) (*ScoringListOutput, error)
	UpdateScoringByID(ctx context.Context, input *ScoringUpdateInput) (*ScoringOutput, error)
}

type scoringService struct {
	repo ScoringRepository
}

func NewScoringService(repo ScoringRepository) ScoringService {
	return &scoringService{repo: repo}
}

func (s *scoringService) CreateScoring(
	ctx context.Context,
	input *ScoringCreateInput,
) (*ScoringOutput, error) {
	createdBy, err := utils.ParseUUID(input.Body.CreatedBy, "created_by")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	competitorID, err := utils.ParseUUID(input.Body.CompetitorID, "competitor_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	BoutID, err := utils.ParseUUID(input.Body.BoutID, "bout_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	scoring := &Scoring{
		CreatedBy:    createdBy,
		Points:       input.Body.Points,
		CompetitorID: competitorID,
		BoutID:       BoutID,
	}

	if err := s.repo.CreateScoring(ctx, scoring); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create scoring: %w", err))
	}

	return &ScoringOutput{Body: newScoringResponse(*scoring)}, nil
}

func (s *scoringService) GetScoringByID(
	ctx context.Context,
	input *ScoringIDInput,
) (*ScoringOutput, error) {
	scoring, err := s.repo.GetScoringByID(ctx, input.ID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get scoring: %w", err))
	}

	return &ScoringOutput{Body: newScoringResponse(*scoring)}, nil
}

func (s *scoringService) ListScoring(
	ctx context.Context,
	input *ScoringListInput,
) (*ScoringListOutput, error) {
	BoutID, err := utils.ParseUUID(input.BoutID, "bout_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	limit := input.Limit
	if limit <= 0 {
		limit = ScoringDefaultPageSize
	}
	limit = utils.Clamp(limit, ScoringMinPageSize, ScoringMaxPageSize)
	offset := max(input.Offset, 0)

	scores, total, err := s.repo.ListScoring(ctx, ScoringListFilter{
		BoutID:         &BoutID,
		IncludeRevoked: input.IncludeRevoked,
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list scoring: %w", err))
	}

	data := make([]ScoringResponse, 0, len(scores))
	for _, listed := range scores {
		data = append(data, newScoringResponse(listed))
	}

	return &ScoringListOutput{Body: ScoringListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *scoringService) UpdateScoringByID(
	ctx context.Context,
	input *ScoringUpdateInput,
) (*ScoringOutput, error) {
	scoring, err := s.repo.GetScoringByID(ctx, input.ID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get scoring: %w", err))
	}

	if scoring.RevokedAt != nil {
		return nil, errs.HumaError(errs.Public(
			"score has been revoked and can no longer be edited", errs.ErrConflict))
	}

	if input.Body.Points == nil && input.Body.CompetitorID == nil {
		return nil, errs.HumaError(errs.Public("no fields to update", errs.ErrInvalidInput))
	}

	if input.Body.Points != nil {
		scoring.Points = *input.Body.Points
	}

	if input.Body.CompetitorID != nil {
		competitorID, err := utils.ParseUUID(*input.Body.CompetitorID, "competitor_id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		scoring.CompetitorID = competitorID
	}

	if err := s.repo.UpdateScoring(ctx, scoring); err != nil {
		return nil, errs.HumaError(fmt.Errorf("update scoring: %w", err))
	}

	return &ScoringOutput{Body: newScoringResponse(*scoring)}, nil
}

func (s *scoringService) RevokeScoring(
	ctx context.Context,
	input *ScoringRevokeInput,
) (*ScoringOutput, error) {
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

	if err := s.repo.RevokeScoring(ctx, scoring); err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(errs.Public("score has already been revoked", errs.ErrConflict))
		}
		return nil, errs.HumaError(fmt.Errorf("revoke scoring: %w", err))
	}

	return &ScoringOutput{Body: newScoringResponse(*scoring)}, nil
}
