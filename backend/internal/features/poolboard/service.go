package poolboard

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	PoolBoardMinPageSize     = 1
	PoolBoardDefaultPageSize = 20
	PoolBoardMaxPageSize     = 100
)

type PoolBoardService interface {
	ListPoolBoards(ctx context.Context, input *PoolBoardListInput) (*PoolBoardListOutput, error)
	GetPoolBoardByID(ctx context.Context, input *PoolBoardIDInput) (*PoolBoardOutput, error)
}

type poolBoardService struct {
	repo PoolBoardRepository
}

func NewPoolBoardService(repo PoolBoardRepository) PoolBoardService {
	return &poolBoardService{repo: repo}
}

func (s *poolBoardService) ListPoolBoards(ctx context.Context, input *PoolBoardListInput) (*PoolBoardListOutput, error) {
	eventID, err := utils.ParseUUID(input.EventID, "event_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	limit := input.Limit
	if limit <= 0 {
		limit = PoolBoardDefaultPageSize
	}
	limit = utils.Clamp(limit, PoolBoardMinPageSize, PoolBoardMaxPageSize)
	offset := max(input.Offset, 0)

	pools, total, err := s.repo.ListPoolsByEventID(ctx, PoolBoardListFilter{
		EventID: eventID,
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list pool boards: %w", err))
	}

	data := make([]PoolBoardResponse, 0, len(pools))
	if len(pools) > 0 {
		ids := make([]uuid.UUID, 0, len(pools))
		for _, pool := range pools {
			ids = append(ids, pool.ID)
		}

		fencers, bouts, err := s.loadBoardRows(ctx, ids)
		if err != nil {
			return nil, err
		}

		fencersByPool := make(map[uuid.UUID][]PoolBoardFencerRow, len(pools))
		for _, fencer := range fencers {
			fencersByPool[fencer.PoolID] = append(fencersByPool[fencer.PoolID], fencer)
		}
		boutsByPool := make(map[uuid.UUID][]PoolBoardBoutRow, len(pools))
		for _, bout := range bouts {
			boutsByPool[bout.PoolID] = append(boutsByPool[bout.PoolID], bout)
		}

		for _, pool := range pools {
			data = append(data, newPoolBoardResponse(pool, fencersByPool[pool.ID], boutsByPool[pool.ID]))
		}
	}

	return &PoolBoardListOutput{Body: PoolBoardListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *poolBoardService) GetPoolBoardByID(ctx context.Context, input *PoolBoardIDInput) (*PoolBoardOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	pool, err := s.repo.GetPoolByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool board: %w", err))
	}

	fencers, bouts, err := s.loadBoardRows(ctx, []uuid.UUID{id})
	if err != nil {
		return nil, err
	}

	return &PoolBoardOutput{Body: newPoolBoardResponse(*pool, fencers, bouts)}, nil
}

func (s *poolBoardService) loadBoardRows(ctx context.Context, poolIDs []uuid.UUID) ([]PoolBoardFencerRow, []PoolBoardBoutRow, error) {
	fencers, err := s.repo.ListFencersByPoolIDs(ctx, poolIDs)
	if err != nil {
		return nil, nil, errs.HumaError(fmt.Errorf("list pool board fencers: %w", err))
	}

	bouts, err := s.repo.ListBoutsByPoolIDs(ctx, poolIDs)
	if err != nil {
		return nil, nil, errs.HumaError(fmt.Errorf("list pool board bouts: %w", err))
	}

	return fencers, bouts, nil
}
