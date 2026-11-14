package eventresult

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/event"
	"boutline/internal/features/poolstage"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

// EventLookup is the subset of the EventRepository interface needed here.
type EventLookup interface {
	GetEventByID(ctx context.Context, id uuid.UUID) (*event.Event, error)
}

type EventResultService interface {
	ListEventResults(ctx context.Context, input *EventResultListInput) (*EventResultListOutput, error)
}

type eventResultService struct {
	repo   EventResultRepository
	events EventLookup
}

func NewEventResultService(repo EventResultRepository, events EventLookup) EventResultService {
	return &eventResultService{repo: repo, events: events}
}

func (s *eventResultService) ListEventResults(ctx context.Context, input *EventResultListInput) (*EventResultListOutput, error) {
	eventID, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	limit := utils.Clamp(input.Limit, EventResultMinPageSize, EventResultMaxPageSize)
	if input.Limit <= 0 {
		limit = EventResultDefaultPageSize
	}
	offset := max(input.Offset, 0)

	if _, err := s.events.GetEventByID(ctx, eventID); err != nil {
		return nil, errs.HumaError(fmt.Errorf("get event: %w", err))
	}

	rows, err := s.classify(ctx, eventID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	end := min(offset+limit, len(rows))
	page := rows[min(offset, end):end]
	data := make([]EventResultResponse, 0, len(page))
	for _, row := range page {
		data = append(data, newEventResultResponse(row))
	}

	return &EventResultListOutput{Body: EventResultListBody{
		Data: data, Total: int64(len(rows)), Limit: limit, Offset: offset,
	}}, nil
}

func (s *eventResultService) classify(ctx context.Context, eventID uuid.UUID) ([]EventResultRow, error) {
	in, err := s.loadEventResultInputs(ctx, eventID)
	if err != nil {
		return nil, err
	}

	ids := eventResultCompetitorIDs(in)
	if len(ids) == 0 {
		return nil, nil
	}

	found, err := s.repo.ListEventResultCompetitors(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("list competitors: %w", err)
	}
	competitors := make(map[uuid.UUID]EventResultCompetitor, len(found))
	for _, c := range found {
		competitors[c.ID] = c
	}

	return aggregateEventResults(in, competitors), nil
}

// A missing stage is not an error here: an event can legitimately have neither.
func (s *eventResultService) loadEventResultInputs(ctx context.Context, eventID uuid.UUID) (eventResultInputs, error) {
	var in eventResultInputs

	stage, err := s.repo.GetLatestPoolStage(ctx, eventID)
	switch {
	case errors.Is(err, errs.ErrNotFound):
	case err != nil:
		return in, fmt.Errorf("get pool stage: %w", err)
	case stage.Status == poolstage.PoolStageStatusEnded:
		if in.poolBouts, err = s.repo.ListPoolStageBouts(ctx, stage.ID); err != nil {
			return in, fmt.Errorf("list pool stage bouts: %w", err)
		}
	}

	elimination, err := s.repo.GetLatestDirectElimination(ctx, eventID)
	switch {
	case errors.Is(err, errs.ErrNotFound):
	case err != nil:
		return in, fmt.Errorf("get direct elimination: %w", err)
	case elimination.Status == directelimination.DirectEliminationStatusEnded:
		if in.entrants, err = s.repo.ListDirectEliminationEntrants(ctx, elimination.ID); err != nil {
			return in, fmt.Errorf("list direct elimination entrants: %w", err)
		}
		if in.tableauBouts, err = s.repo.ListDirectEliminationBouts(ctx, elimination.ID); err != nil {
			return in, fmt.Errorf("list direct elimination bouts: %w", err)
		}
	}

	return in, nil
}
