package event

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/tournament"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	EventMinPageSize     = 1
	EventDefaultPageSize = 20
	EventMaxPageSize     = 100
)

// TournamentLookup is the slice of tournament.TournamentRepository the event
// service needs; tournament.TournamentRepository satisfies it.
type TournamentLookup interface {
	GetTournamentByID(ctx context.Context, id uuid.UUID) (*tournament.Tournament, error)
}

type EventService interface {
	CreateEvent(ctx context.Context, input *EventCreateInput) (*EventOutput, error)
	GetEventByID(ctx context.Context, input *EventIDInput) (*EventOutput, error)
	ListEvents(ctx context.Context, input *EventListInput) (*EventListOutput, error)
	UpdateEventByID(ctx context.Context, input *EventUpdateInput) (*EventOutput, error)
	DeleteEventByID(ctx context.Context, input *EventIDInput) (*struct{}, error)
}

type eventService struct {
	repo        EventRepository
	tournaments TournamentLookup
}

func NewEventService(repo EventRepository, tournaments TournamentLookup) EventService {
	return &eventService{repo: repo, tournaments: tournaments}
}

func (s *eventService) CreateEvent(ctx context.Context, input *EventCreateInput) (*EventOutput, error) {
	tournamentID, err := utils.ParseUUID(input.Body.TournamentID, "tournament_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if input.Body.Name == "" {
		return nil, errs.HumaError(errs.Public("name must not be blank", errs.ErrInvalidInput))
	}

	if _, err := s.tournaments.GetTournamentByID(ctx, tournamentID); err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			return nil, errs.HumaError(errs.Public(
				"tournament_id must reference an existing tournament", errs.ErrInvalidInput))
		}
		return nil, errs.HumaError(fmt.Errorf("get tournament: %w", err))
	}

	event := &Event{
		TournamentID: tournamentID,
		Format:       EventFormatPoolThenDirectElimination,
		Name:         input.Body.Name,
		Status:       EventStatusUpcoming,
		StartTime:    input.Body.StartTime,
	}
	if err := s.repo.CreateEvent(ctx, event); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create event: %w", err))
	}

	return &EventOutput{Body: newEventResponse(*event)}, nil
}

func (s *eventService) GetEventByID(ctx context.Context, input *EventIDInput) (*EventOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	event, err := s.repo.GetEventByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get event: %w", err))
	}

	return &EventOutput{Body: newEventResponse(*event)}, nil
}

func (s *eventService) ListEvents(ctx context.Context, input *EventListInput) (*EventListOutput, error) {
	if input.Status != "" && !input.Status.IsValid() {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("unknown status %q", input.Status), errs.ErrInvalidInput))
	}

	var tournamentID *uuid.UUID
	if input.TournamentID != "" {
		id, err := utils.ParseUUID(input.TournamentID, "tournament_id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		tournamentID = &id
	}

	limit := input.Limit
	if limit <= 0 {
		limit = EventDefaultPageSize
	}
	limit = utils.Clamp(limit, EventMinPageSize, EventMaxPageSize)
	offset := max(input.Offset, 0)

	events, total, err := s.repo.ListEvents(ctx, EventListFilter{
		TournamentID: tournamentID,
		Status:       input.Status,
		Limit:        limit,
		Offset:       offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list events: %w", err))
	}

	data := make([]EventResponse, 0, len(events))
	for _, listed := range events {
		data = append(data, newEventResponse(listed))
	}

	return &EventListOutput{Body: EventListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *eventService) UpdateEventByID(ctx context.Context, input *EventUpdateInput) (*EventOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	edit, err := eventEditFrom(input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.EditEventByID(ctx, id, edit); err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("update event: %w",
				errs.Public("only an upcoming event can be edited", err)))
		}
		return nil, errs.HumaError(fmt.Errorf("update event: %w", err))
	}

	event, err := s.repo.GetEventByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated event: %w", err))
	}

	return &EventOutput{Body: newEventResponse(*event)}, nil
}

func eventEditFrom(body EventUpdateBody) (EventEdit, error) {
	if body.Name != nil && *body.Name == "" {
		return EventEdit{}, errs.Public("name must not be blank", errs.ErrInvalidInput)
	}
	if body.Name == nil && body.StartTime == nil {
		return EventEdit{}, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return EventEdit(body), nil
}

func (s *eventService) DeleteEventByID(ctx context.Context, input *EventIDInput) (*struct{}, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeleteEventByID(ctx, id); err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("delete event: %w",
				errs.Public("only an upcoming event can be deleted", err)))
		}
		return nil, errs.HumaError(fmt.Errorf("delete event: %w", err))
	}

	return nil, nil
}
