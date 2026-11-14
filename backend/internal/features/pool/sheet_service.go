package pool

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	PoolSheetMinPageSize     = 1
	PoolSheetDefaultPageSize = 20
	PoolSheetMaxPageSize     = 100
	PoolSheetMaxIDs          = 100
)

type PoolSheetService interface {
	ListPoolSheets(ctx context.Context, input *PoolSheetListInput) (*PoolSheetListOutput, error)
	GetPoolSheetByID(ctx context.Context, input *PoolSheetIDInput) (*PoolSheetOutput, error)
}

type poolSheetService struct {
	repo PoolSheetRepository
}

func NewPoolSheetService(repo PoolSheetRepository) PoolSheetService {
	return &poolSheetService{repo: repo}
}

func (s *poolSheetService) ListPoolSheets(ctx context.Context, input *PoolSheetListInput) (*PoolSheetListOutput, error) {
	filter, err := poolSheetListFilterFrom(input)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	var data []PoolSheetResponse
	var total int64
	err = s.repo.ReadSnapshot(ctx, func(repo PoolSheetRepository) error {
		pools, count, err := repo.ListPoolSheets(ctx, filter)
		if err != nil {
			return fmt.Errorf("list pool sheets: %w", err)
		}
		total = count
		data, err = assemblePoolSheets(ctx, repo, pools)
		return err
	})
	if err != nil {
		return nil, errs.HumaError(err)
	}

	return &PoolSheetListOutput{Body: PoolSheetListBody{
		Data:   data,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}}, nil
}

// poolSheetListFilterFrom lists an event's pools, the named pools (a viewer's pins,
// which can span events) or the named pools within an event, but never every pool.
func poolSheetListFilterFrom(input *PoolSheetListInput) (PoolSheetListFilter, error) {
	limit := input.Limit
	if limit <= 0 {
		limit = PoolSheetDefaultPageSize
	}
	filter := PoolSheetListFilter{
		Limit:  utils.Clamp(limit, PoolSheetMinPageSize, PoolSheetMaxPageSize),
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
	if len(ids) > PoolSheetMaxIDs {
		return filter, errs.Public(
			fmt.Sprintf("ids must not contain more than %d values", PoolSheetMaxIDs), errs.ErrInvalidInput)
	}
	filter.IDs = ids

	if filter.EventID == nil && len(filter.IDs) == 0 {
		return filter, errs.Public("provide event_id, ids or both", errs.ErrInvalidInput)
	}

	return filter, nil
}

func (s *poolSheetService) GetPoolSheetByID(ctx context.Context, input *PoolSheetIDInput) (*PoolSheetOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	var sheet PoolSheetResponse
	err = s.repo.ReadSnapshot(ctx, func(repo PoolSheetRepository) error {
		pool, err := repo.GetPoolSheetByID(ctx, id)
		if err != nil {
			return fmt.Errorf("get pool sheet: %w", err)
		}
		fencers, bouts, err := loadSheetRows(ctx, repo, []uuid.UUID{id})
		if err != nil {
			return err
		}
		sheet = newPoolSheetResponse(*pool, fencers, bouts)
		return nil
	})
	if err != nil {
		return nil, errs.HumaError(err)
	}

	return &PoolSheetOutput{Body: sheet}, nil
}

// assemblePoolSheets loads every listed pool's fencers and bouts in one query each
// and groups them back onto their pools, keeping the pools' order.
func assemblePoolSheets(ctx context.Context, repo PoolSheetRepository, pools []PoolSheetPoolRow) ([]PoolSheetResponse, error) {
	data := make([]PoolSheetResponse, 0, len(pools))
	if len(pools) == 0 {
		return data, nil
	}

	ids := make([]uuid.UUID, 0, len(pools))
	for _, pool := range pools {
		ids = append(ids, pool.ID)
	}
	fencers, bouts, err := loadSheetRows(ctx, repo, ids)
	if err != nil {
		return nil, err
	}

	fencersByPool := make(map[uuid.UUID][]PoolSheetFencerRow, len(pools))
	for _, fencer := range fencers {
		fencersByPool[fencer.PoolID] = append(fencersByPool[fencer.PoolID], fencer)
	}
	boutsByPool := make(map[uuid.UUID][]PoolSheetBoutRow, len(pools))
	for _, bout := range bouts {
		boutsByPool[bout.PoolID] = append(boutsByPool[bout.PoolID], bout)
	}

	for _, pool := range pools {
		data = append(data, newPoolSheetResponse(pool, fencersByPool[pool.ID], boutsByPool[pool.ID]))
	}
	return data, nil
}

func loadSheetRows(ctx context.Context, repo PoolSheetRepository, poolIDs []uuid.UUID) ([]PoolSheetFencerRow, []PoolSheetBoutRow, error) {
	fencers, err := repo.ListPoolSheetFencers(ctx, poolIDs)
	if err != nil {
		return nil, nil, fmt.Errorf("list pool sheet fencers: %w", err)
	}

	bouts, err := repo.ListPoolSheetBouts(ctx, poolIDs)
	if err != nil {
		return nil, nil, fmt.Errorf("list pool sheet bouts: %w", err)
	}

	return fencers, bouts, nil
}
