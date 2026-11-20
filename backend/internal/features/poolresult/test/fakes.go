package test

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/event"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolresult"

	"github.com/google/uuid"
)

var _ poolresult.PoolResultRepository = (*FakePoolResultRepository)(nil)

// FakePoolResultRepository mirrors the SQL: GetLatestPoolStageID fails with
// ErrNotFound when the event has no pool stage.
type FakePoolResultRepository struct {
	PoolStages map[uuid.UUID]uuid.UUID                     // stage ID by event ID
	Fencers    map[uuid.UUID][]poolresult.PoolResultFencer // by pool stage ID
	Bouts      map[uuid.UUID][]pool.PoolSheetBoutRow       // by pool stage ID
	Entrants   map[uuid.UUID][]uuid.UUID                   // by event ID
	Err        error                                       // when set, every method fails with it
}

func (f *FakePoolResultRepository) GetLatestPoolStageID(_ context.Context, eventID uuid.UUID) (uuid.UUID, error) {
	if f.Err != nil {
		return uuid.Nil, f.Err
	}
	id, ok := f.PoolStages[eventID]
	if !ok {
		return uuid.Nil, fmt.Errorf("select latest pool stage for event %s: %w", eventID, errs.ErrNotFound)
	}

	return id, nil
}

func (f *FakePoolResultRepository) ListPoolResultFencers(_ context.Context, poolStageID uuid.UUID) ([]poolresult.PoolResultFencer, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	return f.Fencers[poolStageID], nil
}

func (f *FakePoolResultRepository) ListPoolStageBouts(_ context.Context, poolStageID uuid.UUID) ([]pool.PoolSheetBoutRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	return f.Bouts[poolStageID], nil
}

func (f *FakePoolResultRepository) ListTableauEntrantIDs(_ context.Context, eventID uuid.UUID) ([]uuid.UUID, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	return f.Entrants[eventID], nil
}

var _ poolresult.EventLookup = (*FakeEventLookup)(nil)

type FakeEventLookup struct {
	Events map[uuid.UUID]event.Event
}

func (f *FakeEventLookup) GetEventByID(_ context.Context, id uuid.UUID) (*event.Event, error) {
	found, ok := f.Events[id]
	if !ok {
		return nil, fmt.Errorf("select event %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}
