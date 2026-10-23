package pool

import (
	"context"
	"errors"
	"fmt"
	"time"

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

// poolMaxFencers caps a pool at the largest size with a standard bout order.
const poolMaxFencers = 10

const (
	msgPoolStarted = "this pool has already started"
	msgPoolEnded   = "this pool has already ended"
)

// PoolStageLookup is the subset of the PoolStageRepository interface needed here.
type PoolStageLookup interface {
	GetPoolStageByID(ctx context.Context, id uuid.UUID) (*poolstage.PoolStage, error)
}

type PoolService interface {
	CreatePools(ctx context.Context, input *PoolCreateInput) (*PoolCreatedOutput, error)
	GetPoolByID(ctx context.Context, input *PoolIDInput) (*PoolOutput, error)
	ListPools(ctx context.Context, input *PoolListInput) (*PoolListOutput, error)
	UpdatePoolByID(ctx context.Context, input *PoolUpdateInput) (*PoolOutput, error)
	StartPool(ctx context.Context, input *PoolIDInput) (*PoolOutput, error)
	EndPool(ctx context.Context, input *PoolIDInput) (*PoolOutput, error)
	DeletePoolByID(ctx context.Context, input *PoolIDInput) (*struct{}, error)
}

type poolService struct {
	repo       PoolRepository
	poolStages PoolStageLookup
}

func NewPoolService(repo PoolRepository, poolStages PoolStageLookup) PoolService {
	return &poolService{repo: repo, poolStages: poolStages}
}

func (s *poolService) CreatePools(ctx context.Context, input *PoolCreateInput) (*PoolCreatedOutput, error) {
	requests, err := parsePoolRequests(input.Body.Pools)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	stageID := requests[0].pool.PoolStageID
	stage, err := s.requireUpcomingPoolStage(ctx, stageID)
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if err := checkFencerCounts(requests, min(stage.MaxCompetitorPerPool, poolMaxFencers)); err != nil {
		return nil, errs.HumaError(err)
	}

	entrants, err := s.loadEntrants(ctx, stageID, requests)
	if err != nil {
		return nil, errs.HumaError(err)
	}
	tournamentID, err := s.repo.GetPoolStageTournamentID(ctx, stageID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool stage tournament: %w", err))
	}

	lineups := make([]PoolLineup, 0, len(requests))
	for _, request := range requests {
		seated := make([]PoolEntrant, 0, len(request.fencers))
		for _, id := range request.fencers {
			seated = append(seated, entrants[id])
		}
		lineups = append(lineups, newPoolLineup(
			request.pool, seated, tournamentID, input.Body.PointsToWin, input.Body.TimeLimitSeconds))
	}
	if err := s.repo.CreatePoolsWithBouts(ctx, lineups); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create pools: %w", err))
	}

	data := make([]PoolCreatedResponse, 0, len(lineups))
	for _, lineup := range lineups {
		data = append(data, newPoolCreatedResponse(lineup))
	}

	return &PoolCreatedOutput{Body: PoolCreatedBody{Data: data}}, nil
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
	update := PoolUpdate{
		RefereeID: refereeID,
		Number:    input.Body.Number,
		Strip:     input.Body.Strip,
		StartTime: input.Body.StartTime,
	}
	if len(update.columns()) == 0 {
		return nil, errs.HumaError(errs.Public("provide at least one field to update", errs.ErrInvalidInput))
	}

	if err := s.repo.UpdatePoolByID(ctx, id, update); err != nil {
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

func (s *poolService) StartPool(ctx context.Context, input *PoolIDInput) (*PoolOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	pool, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool: %w", err))
	}
	if pool.StartedAt != nil {
		return nil, errs.HumaError(errs.Public(msgPoolStarted, errs.ErrConflict))
	}
	if pool.RefereeID == nil {
		return nil, errs.HumaError(errs.Public(
			"a referee must be assigned before the pool can start", errs.ErrConflict))
	}

	stage, err := s.poolStages.GetPoolStageByID(ctx, pool.PoolStageID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool stage: %w", err))
	}
	if stage.Status != poolstage.PoolStageStatusActive {
		return nil, errs.HumaError(errs.Public(
			"pools can only be started in an active pool stage", errs.ErrConflict))
	}

	err = s.repo.StartPoolByID(ctx, id, time.Now().UTC())

	return s.updateResponse(ctx, id, err, msgPoolStarted)
}

func (s *poolService) EndPool(ctx context.Context, input *PoolIDInput) (*PoolOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	pool, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool: %w", err))
	}
	if pool.StartedAt == nil {
		return nil, errs.HumaError(errs.Public("a pool must start before it can end", errs.ErrConflict))
	}
	if pool.CompletedAt != nil {
		return nil, errs.HumaError(errs.Public(msgPoolEnded, errs.ErrConflict))
	}

	open, err := s.repo.CountOpenPoolBouts(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("count open bouts: %w", err))
	}
	if open > 0 {
		return nil, errs.HumaError(errs.Public(
			"every bout in the pool must end before the pool can end", errs.ErrConflict))
	}

	err = s.repo.EndPoolByID(ctx, id, time.Now().UTC())

	return s.updateResponse(ctx, id, err, msgPoolEnded)
}

func (s *poolService) updateResponse(ctx context.Context, id uuid.UUID, err error, conflictMessage string) (*PoolOutput, error) {
	if err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("update pool: %w", errs.Public(conflictMessage, err)))
		}

		return nil, errs.HumaError(fmt.Errorf("update pool: %w", err))
	}

	pool, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated pool: %w", err))
	}

	return &PoolOutput{Body: newPoolResponse(*pool)}, nil
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
