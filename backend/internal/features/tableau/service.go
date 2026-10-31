package tableau

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"boutline/internal/errs"
	"boutline/internal/features/bout"
	"boutline/internal/features/event"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const minTableSize = 2

// EventLookup is the subset of the EventRepository interface needed here.
type EventLookup interface {
	GetEventByID(ctx context.Context, id uuid.UUID) (*event.Event, error)
}

type TableauService interface {
	GetTableau(ctx context.Context, input *TableauInput) (*TableauOutput, error)
}

type tableauService struct {
	repo   TableauRepository
	events EventLookup
}

func NewTableauService(repo TableauRepository, events EventLookup) TableauService {
	return &tableauService{repo: repo, events: events}
}

type scoreKey struct {
	boutID       uuid.UUID
	competitorID uuid.UUID
}

func (s *tableauService) GetTableau(ctx context.Context, input *TableauInput) (*TableauOutput, error) {
	eventID, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if _, err := s.events.GetEventByID(ctx, eventID); err != nil {
		return nil, errs.HumaError(fmt.Errorf("get event: %w", err))
	}

	drawn, err := s.repo.GetLatestTableau(ctx, eventID)
	if err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			return &TableauOutput{Body: TableauBody{Rounds: []RoundResponse{}}}, nil
		}
		return nil, errs.HumaError(fmt.Errorf("get tableau: %w", err))
	}
	if drawn.EntryCount == 0 {
		return &TableauOutput{Body: TableauBody{Rounds: []RoundResponse{}}}, nil
	}

	rows, err := s.repo.ListTableauBouts(ctx, drawn.ID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list tableau bouts: %w", err))
	}

	scores, err := s.scoresByBout(ctx, rows)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	slices.SortFunc(rows, func(a, b BoutRow) int { return a.Slot - b.Slot })

	boutsBySize := make(map[int][]TableauBoutResponse)
	for _, row := range rows {
		resp, err := newTableauBoutResponse(row, scores)
		if err != nil {
			return nil, errs.HumaError(fmt.Errorf("direct elimination %s: %w", drawn.ID, err))
		}
		boutsBySize[row.RoundSize] = append(boutsBySize[row.RoundSize], resp)
	}

	return &TableauOutput{Body: TableauBody{Rounds: buildRounds(drawn.EntryCount, boutsBySize)}}, nil
}

func (s *tableauService) scoresByBout(ctx context.Context, rows []BoutRow) (map[scoreKey]int, error) {
	scores := make(map[scoreKey]int)
	if len(rows) == 0 {
		return scores, nil
	}

	boutIDs := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		boutIDs[i] = row.ID
	}

	sums, err := s.repo.SumBoutScores(ctx, boutIDs)
	if err != nil {
		return nil, fmt.Errorf("sum bout scores: %w", err)
	}
	for _, sum := range sums {
		scores[scoreKey{sum.BoutID, sum.CompetitorID}] = sum.Points
	}

	return scores, nil
}

// buildRounds lists every round from the table size down to the final, so
// rounds nobody has been placed in yet still appear with no bouts.
func buildRounds(entryCount int, boutsBySize map[int][]TableauBoutResponse) []RoundResponse {
	size := minTableSize
	for size < entryCount {
		size *= 2
	}

	rounds := []RoundResponse{}
	for ; size >= minTableSize; size /= 2 {
		bouts := boutsBySize[size]
		if bouts == nil {
			bouts = []TableauBoutResponse{}
		}
		rounds = append(rounds, RoundResponse{Size: size, Bouts: bouts})
	}

	return rounds
}

func newTableauBoutResponse(row BoutRow, scores map[scoreKey]int) (TableauBoutResponse, error) {
	if row.TopSeed == nil || row.BottomSeed == nil {
		return TableauBoutResponse{}, fmt.Errorf("bout %s has a fencer with no entry", row.ID)
	}

	resp := TableauBoutResponse{
		ID:   row.ID.String(),
		Slot: row.Slot,
		Top: FencerResponse{
			ID: row.TopID.String(), FirstName: row.TopFirst, LastName: row.TopLast, Club: row.TopClub, Seed: *row.TopSeed,
		},
		Bottom: FencerResponse{
			ID: row.BottomID.String(), FirstName: row.BottomFirst, LastName: row.BottomLast, Club: row.BottomClub, Seed: *row.BottomSeed,
		},
	}
	if row.Status != bout.BoutStatusUpcoming {
		top, bottom := scores[scoreKey{row.ID, row.TopID}], scores[scoreKey{row.ID, row.BottomID}]
		resp.TopScore, resp.BottomScore = &top, &bottom
	}

	return resp, nil
}
