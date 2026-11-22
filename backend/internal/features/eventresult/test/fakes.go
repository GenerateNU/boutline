package test

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/event"
	"boutline/internal/features/eventresult"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
)

var _ eventresult.EventResultRepository = (*FakeEventResultRepository)(nil)

// FakeEventResultRepository mirrors the SQL: GetLatest* fails with ErrNotFound
// when the event has no such stage.
type FakeEventResultRepository struct {
	PoolStages   map[uuid.UUID]eventresult.EventResultPoolStageRow            // by event ID
	Eliminations map[uuid.UUID]eventresult.EventResultDirectEliminationRow    // by event ID
	PoolBouts    map[uuid.UUID][]pool.PoolSheetBoutRow                        // by pool stage ID
	PoolFencers  map[uuid.UUID][]eventresult.PoolStageResultFencer            // by pool stage ID
	Entrants     map[uuid.UUID][]directelimination.DirectEliminationEntrant   // by direct elimination ID
	DEBouts      map[uuid.UUID][]directelimination.DirectEliminationBoutScore // by direct elimination ID
	Competitors  map[uuid.UUID]eventresult.EventResultCompetitor
	Err          error // when set, every method fails with it
}

func (f *FakeEventResultRepository) GetLatestPoolStage(_ context.Context, eventID uuid.UUID) (*eventresult.EventResultPoolStageRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}
	found, ok := f.PoolStages[eventID]
	if !ok {
		return nil, fmt.Errorf("select latest pool_stages for event %s: %w", eventID, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeEventResultRepository) GetLatestDirectElimination(_ context.Context, eventID uuid.UUID) (*eventresult.EventResultDirectEliminationRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}
	found, ok := f.Eliminations[eventID]
	if !ok {
		return nil, fmt.Errorf("select latest direct_eliminations for event %s: %w", eventID, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeEventResultRepository) ListPoolStageBouts(_ context.Context, poolStageID uuid.UUID) ([]pool.PoolSheetBoutRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	return f.PoolBouts[poolStageID], nil
}

func (f *FakeEventResultRepository) ListPoolStageResultFencers(_ context.Context, poolStageID uuid.UUID) ([]eventresult.PoolStageResultFencer, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	return f.PoolFencers[poolStageID], nil
}

func (f *FakeEventResultRepository) ListDirectEliminationEntrants(_ context.Context, directEliminationID uuid.UUID) ([]directelimination.DirectEliminationEntrant, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	return f.Entrants[directEliminationID], nil
}

func (f *FakeEventResultRepository) ListDirectEliminationBouts(_ context.Context, directEliminationID uuid.UUID) ([]directelimination.DirectEliminationBoutScore, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	return f.DEBouts[directEliminationID], nil
}

func (f *FakeEventResultRepository) ListEventResultCompetitors(_ context.Context, ids []uuid.UUID) ([]eventresult.EventResultCompetitor, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var rows []eventresult.EventResultCompetitor
	for _, id := range ids {
		if c, ok := f.Competitors[id]; ok {
			rows = append(rows, c)
		}
	}

	return rows, nil
}

var _ eventresult.EventLookup = (*FakeEventLookup)(nil)

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
