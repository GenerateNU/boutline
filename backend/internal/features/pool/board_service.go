package pool

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
	PoolBoardMaxIDs          = 100
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
	filter, err := poolBoardListFilterFrom(input)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	pools, total, err := s.repo.ListPoolBoards(ctx, filter)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list pool boards: %w", err))
	}

	data, err := s.assemblePoolBoards(ctx, pools)
	if err != nil {
		return nil, err
	}

	return &PoolBoardListOutput{Body: PoolBoardListBody{
		Data:   data,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}}, nil
}

// poolBoardListFilterFrom lists an event's pools, the named pools (a viewer's pins,
// which can span events) or the named pools within an event, but never every pool.
func poolBoardListFilterFrom(input *PoolBoardListInput) (PoolBoardListFilter, error) {
	limit := input.Limit
	if limit <= 0 {
		limit = PoolBoardDefaultPageSize
	}
	filter := PoolBoardListFilter{
		Limit:  utils.Clamp(limit, PoolBoardMinPageSize, PoolBoardMaxPageSize),
		Offset: max(input.Offset, 0),
	}

	if input.EventID != "" {
		eventID, err := utils.ParseUUID(input.EventID, "event_id")
		if err != nil {
			return filter, err
		}
		filter.EventID = &eventID
	}

	ids, err := utils.ParseUUIDList(input.IDs, "ids")
	if err != nil {
		return filter, err
	}
	if len(ids) > PoolBoardMaxIDs {
		return filter, errs.Public(
			fmt.Sprintf("ids must not contain more than %d values", PoolBoardMaxIDs), errs.ErrInvalidInput)
	}
	filter.IDs = ids

	if filter.EventID == nil && len(filter.IDs) == 0 {
		return filter, errs.Public("provide event_id, ids or both", errs.ErrInvalidInput)
	}

	return filter, nil
}

func (s *poolBoardService) GetPoolBoardByID(ctx context.Context, input *PoolBoardIDInput) (*PoolBoardOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	pool, err := s.repo.GetPoolBoardByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get pool board: %w", err))
	}

	fencers, bouts, err := s.loadBoardRows(ctx, []uuid.UUID{id})
	if err != nil {
		return nil, err
	}

	return &PoolBoardOutput{Body: newPoolBoardResponse(*pool, fencers, bouts)}, nil
}

// assemblePoolBoards loads every listed pool's fencers and bouts in one query each
// and groups them back onto their pools, keeping the pools' order.
func (s *poolBoardService) assemblePoolBoards(ctx context.Context, pools []PoolBoardPoolRow) ([]PoolBoardResponse, error) {
	data := make([]PoolBoardResponse, 0, len(pools))
	if len(pools) == 0 {
		return data, nil
	}

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
	return data, nil
}

func (s *poolBoardService) loadBoardRows(ctx context.Context, poolIDs []uuid.UUID) ([]PoolBoardFencerRow, []PoolBoardBoutRow, error) {
	fencers, err := s.repo.ListPoolBoardFencers(ctx, poolIDs)
	if err != nil {
		return nil, nil, errs.HumaError(fmt.Errorf("list pool board fencers: %w", err))
	}

	bouts, err := s.repo.ListPoolBoardBouts(ctx, poolIDs)
	if err != nil {
		return nil, nil, errs.HumaError(fmt.Errorf("list pool board bouts: %w", err))
	}

	return fencers, bouts, nil
}
