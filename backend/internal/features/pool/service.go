package pool

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/poolstage"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	PoolMinPageSize     = 1
	PoolDefaultPageSize = 20
	PoolMaxPageSize     = 100
)

// PoolStageLookup is the subset of the PoolStageRepository interface needed here.
type PoolStageLookup interface {
	GetPoolStageByID(ctx context.Context, id uuid.UUID) (*poolstage.PoolStage, error)
}

type PoolService interface {
	CreatePool(ctx context.Context, input *PoolCreateInput) (*PoolOutput, error)
	GetPoolByID(ctx context.Context, input *PoolIDInput) (*PoolOutput, error)
	ListPools(ctx context.Context, input *PoolListInput) (*PoolListOutput, error)
	UpdatePoolByID(ctx context.Context, input *PoolUpdateInput) (*PoolOutput, error)
	DeletePoolByID(ctx context.Context, input *PoolIDInput) (*struct{}, error)
}

type poolService struct {
	repo       PoolRepository
	poolStages PoolStageLookup
}

func NewPoolService(repo PoolRepository, poolStages PoolStageLookup) PoolService {
	return &poolService{repo: repo, poolStages: poolStages}
}

func (s *poolService) CreatePool(ctx context.Context, input *PoolCreateInput) (*PoolOutput, error) {
	poolStageID, err := utils.ParseUUID(input.Body.PoolStageID, "pool_stage_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	refereeID, err := parseOptionalUUID(input.Body.RefereeID, "referee_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if _, err := s.poolStages.GetPoolStageByID(ctx, poolStageID); err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			return nil, errs.HumaError(errs.Public(
				"pool_stage_id must reference an existing pool stage", errs.ErrInvalidInput))
		}
		return nil, errs.HumaError(fmt.Errorf("get pool stage: %w", err))
	}

	pool := &Pool{PoolStageID: poolStageID, RefereeID: refereeID}
	if err := s.repo.CreatePool(ctx, pool); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create pool: %w", err))
	}

	return &PoolOutput{Body: newPoolResponse(*pool)}, nil
}

func (s *poolService) GetPoolByID(ctx context.Context, input *PoolIDInput) (*PoolOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	pool, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool: %w", err))
	}

	return &PoolOutput{Body: newPoolResponse(*pool)}, nil
}

func (s *poolService) ListPools(ctx context.Context, input *PoolListInput) (*PoolListOutput, error) {
	var poolStageID *uuid.UUID
	if input.PoolStageID != "" {
		id, err := utils.ParseUUID(input.PoolStageID, "pool_stage_id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		poolStageID = &id
	}

	limit := input.Limit
	if limit <= 0 {
		limit = PoolDefaultPageSize
	}
	limit = utils.Clamp(limit, PoolMinPageSize, PoolMaxPageSize)
	offset := max(input.Offset, 0)

	pools, total, err := s.repo.ListPools(ctx, PoolListFilter{
		PoolStageID: poolStageID,
		Limit:       limit,
		Offset:      offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list pools: %w", err))
	}

	data := make([]PoolResponse, 0, len(pools))
	for _, listed := range pools {
		data = append(data, newPoolResponse(listed))
	}

	return &PoolListOutput{Body: PoolListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *poolService) UpdatePoolByID(ctx context.Context, input *PoolUpdateInput) (*PoolOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	refereeID, err := parseOptionalUUID(input.Body.RefereeID, "referee_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if refereeID == nil {
		return nil, errs.HumaError(errs.Public("provide at least one field to update", errs.ErrInvalidInput))
	}

	if err := s.repo.UpdatePoolByID(ctx, id, PoolUpdate{RefereeID: refereeID}); err != nil {
		return nil, errs.HumaError(fmt.Errorf("update pool: %w", err))
	}

	pool, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated pool: %w", err))
	}

	return &PoolOutput{Body: newPoolResponse(*pool)}, nil
}

func (s *poolService) DeletePoolByID(ctx context.Context, input *PoolIDInput) (*struct{}, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeletePoolByID(ctx, id); err != nil {
		return nil, errs.HumaError(fmt.Errorf("delete pool: %w", err))
	}

	return nil, nil
}

func parseOptionalUUID(raw *string, field string) (*uuid.UUID, error) {
	if raw == nil {
		return nil, nil
	}

	id, err := utils.ParseUUID(*raw, field)
	if err != nil {
		return nil, err
	}

	return &id, nil
}
