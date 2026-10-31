package test

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/event"
	"boutline/internal/features/scoring"
	"boutline/internal/features/tableau"

	"github.com/google/uuid"
)

var _ tableau.TableauRepository = (*FakeTableauRepository)(nil)

// FakeTableauRepository mirrors the SQL: scorings are summed per bout and
// competitor with revoked rows left out.
type FakeTableauRepository struct {
	Tableaus map[uuid.UUID]tableau.TableauRow // by event ID
	Bouts    map[uuid.UUID][]tableau.BoutRow  // by direct elimination ID
	Scorings []scoring.Scoring
	Err      error // when set, every method fails with it
}

func (f *FakeTableauRepository) GetLatestTableau(_ context.Context, eventID uuid.UUID) (*tableau.TableauRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Tableaus[eventID]
	if !ok {
		return nil, fmt.Errorf("select direct elimination for event %s: %w", eventID, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeTableauRepository) ListTableauBouts(_ context.Context, directEliminationID uuid.UUID) ([]tableau.BoutRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	return append([]tableau.BoutRow(nil), f.Bouts[directEliminationID]...), nil
}

func (f *FakeTableauRepository) SumBoutScores(_ context.Context, boutIDs []uuid.UUID) ([]tableau.ScoreRow, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	type key struct{ bout, competitor uuid.UUID }
	sums := make(map[key]int)
	for _, s := range f.Scorings {
		if s.RevokedAt == nil {
			sums[key{s.BoutID, s.CompetitorID}] += s.Points
		}
	}

	var rows []tableau.ScoreRow
	for k, points := range sums {
		for _, id := range boutIDs {
			if id == k.bout {
				rows = append(rows, tableau.ScoreRow{BoutID: k.bout, CompetitorID: k.competitor, Points: points})
			}
		}
	}

	return rows, nil
}

var _ tableau.EventLookup = (*FakeEventLookup)(nil)

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
