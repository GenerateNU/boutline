package test

import (
	"context"
	"fmt"
	"slices"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/event"
	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

var _ event.EventRepository = (*FakeEventRepository)(nil)

type FakeEventRepository struct {
	Events map[uuid.UUID]event.Event
	Err    error // when set, every method fails with it
}

func NewFakeEventRepository(seed ...event.Event) *FakeEventRepository {
	events := make(map[uuid.UUID]event.Event, len(seed))
	for _, seeded := range seed {
		events[seeded.ID] = seeded
	}

	return &FakeEventRepository{Events: events}
}

func (f *FakeEventRepository) CreateEvent(_ context.Context, toCreate *event.Event) error {
	if f.Err != nil {
		return f.Err
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Events[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeEventRepository) GetEventByID(_ context.Context, id uuid.UUID) (*event.Event, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Events[id]
	if !ok {
		return nil, fmt.Errorf("select event %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeEventRepository) ListEvents(
	_ context.Context,
	filter event.EventListFilter,
) ([]event.Event, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]event.Event, 0, len(f.Events))
	for _, candidate := range f.Events {
		if filter.TournamentID != nil && candidate.TournamentID != *filter.TournamentID {
			continue
		}
		if filter.Status != "" && candidate.Status != filter.Status {
			continue
		}
		matched = append(matched, candidate)
	}

	slices.SortFunc(matched, func(a, b event.Event) int {
		return b.CreatedAt.Compare(a.CreatedAt)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []event.Event{}, total, nil
	}

	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakeEventRepository) EditEventByID(_ context.Context, id uuid.UUID, edit event.EventEdit) error {
	stored, err := f.guard(id, event.EventEditableStatuses())
	if err != nil {
		return err
	}

	if edit.Name != nil {
		stored.Name = *edit.Name
	}
	if edit.StartTime != nil {
		stored.StartTime = edit.StartTime
	}

	f.save(id, stored)

	return nil
}

func (f *FakeEventRepository) DeleteEventByID(_ context.Context, id uuid.UUID) error {
	if _, err := f.guard(id, event.EventDeletableStatuses()); err != nil {
		return err
	}

	delete(f.Events, id)

	return nil
}

func (f *FakeEventRepository) guard(id uuid.UUID, allowedStatuses []event.EventStatus) (event.Event, error) {
	if f.Err != nil {
		return event.Event{}, f.Err
	}

	stored, ok := f.Events[id]
	if !ok {
		return event.Event{}, fmt.Errorf("update event %s: %w", id, errs.ErrNotFound)
	}

	if len(allowedStatuses) > 0 && !slices.Contains(allowedStatuses, stored.Status) {
		return event.Event{}, fmt.Errorf("update event %s: %w", id, errs.ErrConflict)
	}

	return stored, nil
}

func (f *FakeEventRepository) save(id uuid.UUID, stored event.Event) {
	stored.UpdatedAt = time.Now()
	f.Events[id] = stored
}

var _ event.TournamentLookup = (*FakeTournamentLookup)(nil)

type FakeTournamentLookup struct {
	Tournaments map[uuid.UUID]tournament.Tournament
	Err         error
}

func NewFakeTournamentLookup(seed ...tournament.Tournament) *FakeTournamentLookup {
	tournaments := make(map[uuid.UUID]tournament.Tournament, len(seed))
	for _, seeded := range seed {
		tournaments[seeded.ID] = seeded
	}

	return &FakeTournamentLookup{Tournaments: tournaments}
}

func (f *FakeTournamentLookup) GetTournamentByID(_ context.Context, id uuid.UUID) (*tournament.Tournament, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Tournaments[id]
	if !ok {
		return nil, fmt.Errorf("select tournament %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}
