package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/event"
	"boutline/internal/features/tournamentuser"
	tournamentusertest "boutline/internal/features/tournamentuser/test"

	"github.com/google/uuid"
)

var (
	_ directelimination.DirectEliminationRepository = (*FakeDirectEliminationRepository)(nil)
	_ directelimination.EventLookup                 = (*FakeEventLookup)(nil)
)

var (
	TestTournamentID  = uuid.New()
	OtherTournamentID = uuid.New()
	TestAdminID       = uuid.New()
	TestRefereeID     = uuid.New()
	TestOutsiderID    = uuid.New()

	// TestEventID and TestSecondEventID belong to TestTournamentID; OtherEventID
	// belongs to OtherTournamentID, which none of the test users staff.
	TestEventID       = uuid.New()
	TestSecondEventID = uuid.New()
	OtherEventID      = uuid.New()
)

type FakeEventLookup struct {
	Events map[uuid.UUID]event.Event
}

func NewFakeEventLookup() *FakeEventLookup {
	events := map[uuid.UUID]event.Event{
		TestEventID:       {ID: TestEventID, TournamentID: TestTournamentID},
		TestSecondEventID: {ID: TestSecondEventID, TournamentID: TestTournamentID},
		OtherEventID:      {ID: OtherEventID, TournamentID: OtherTournamentID},
	}

	return &FakeEventLookup{Events: events}
}

func (f *FakeEventLookup) GetEventByID(_ context.Context, id uuid.UUID) (*event.Event, error) {
	found, ok := f.Events[id]
	if !ok {
		return nil, fmt.Errorf("select event %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

// NewTestService wires the service to the repo's events and to an admin and a
// referee of TestTournamentID.
func NewTestService(repo *FakeDirectEliminationRepository) directelimination.DirectEliminationService {
	memberships := tournamentusertest.NewFakeMembershipLookup(
		tournamentuser.TournamentUser{
			UserID: TestAdminID, TournamentID: TestTournamentID, Role: tournamentuser.TournamentUserRoleAdmin,
		},
		tournamentuser.TournamentUser{
			UserID: TestRefereeID, TournamentID: TestTournamentID, Role: tournamentuser.TournamentUserRoleReferee,
		},
	)

	return directelimination.NewDirectEliminationService(repo, repo.Events, memberships)
}

type FakeDirectEliminationRepository struct {
	DirectEliminations map[uuid.UUID]directelimination.DirectElimination
	Events             *FakeEventLookup
	Err                error // when set, every method fails with it
}

func NewFakeDirectEliminationRepository(
	seed ...directelimination.DirectElimination,
) *FakeDirectEliminationRepository {
	rounds := make(map[uuid.UUID]directelimination.DirectElimination, len(seed))
	for _, seeded := range seed {
		rounds[seeded.ID] = seeded
	}

	return &FakeDirectEliminationRepository{DirectEliminations: rounds, Events: NewFakeEventLookup()}
}

func (f *FakeDirectEliminationRepository) CreateDirectElimination(
	_ context.Context,
	toCreate *directelimination.DirectElimination,
) error {
	if f.Err != nil {
		return f.Err
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.DirectEliminations[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeDirectEliminationRepository) GetDirectEliminationByID(
	_ context.Context,
	id uuid.UUID,
) (*directelimination.DirectElimination, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.DirectEliminations[id]
	if !ok {
		return nil, fmt.Errorf("select direct elimination %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeDirectEliminationRepository) GetDirectEliminationTournamentID(
	ctx context.Context,
	id uuid.UUID,
) (uuid.UUID, error) {
	stored, err := f.GetDirectEliminationByID(ctx, id)
	if err != nil {
		return uuid.Nil, err
	}

	ev, err := f.Events.GetEventByID(ctx, stored.EventID)
	if err != nil {
		return uuid.Nil, err
	}

	return ev.TournamentID, nil
}

func (f *FakeDirectEliminationRepository) ListDirectElimination(
	_ context.Context,
	filter directelimination.DirectEliminationListFilter,
) ([]directelimination.DirectElimination, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]directelimination.DirectElimination, 0, len(f.DirectEliminations))
	for _, candidate := range f.DirectEliminations {
		if filter.EventID != nil && candidate.EventID != *filter.EventID {
			continue
		}
		if filter.Status != nil && candidate.Status != *filter.Status {
			continue
		}
		matched = append(matched, candidate)
	}

	// Newest first, like the real repository; ID breaks ties so order is stable.
	slices.SortFunc(matched, func(a, b directelimination.DirectElimination) int {
		if c := b.CreatedAt.Compare(a.CreatedAt); c != 0 {
			return c
		}
		return strings.Compare(a.ID.String(), b.ID.String())
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []directelimination.DirectElimination{}, total, nil
	}
	matched = matched[filter.Offset:]
	if filter.Limit > 0 && filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakeDirectEliminationRepository) UpdateDirectEliminationByID(
	_ context.Context,
	id uuid.UUID,
	edit directelimination.DirectEliminationEdit,
) error {
	stored, err := f.guard(id, directelimination.DirectEliminationEditableStatuses())
	if err != nil {
		return err
	}

	if edit.EventID != nil {
		stored.EventID = *edit.EventID
	}

	f.save(id, stored)

	return nil
}

func (f *FakeDirectEliminationRepository) TransitionDirectEliminationByID(
	_ context.Context,
	id uuid.UUID,
	transition directelimination.DirectEliminationTransition,
) error {
	stored, err := f.guard(id, transition.From)
	if err != nil {
		return err
	}

	stored.Status = transition.To
	if transition.StartedAt != nil {
		stored.StartedAt = transition.StartedAt
	}
	if transition.CompletedAt != nil {
		stored.CompletedAt = transition.CompletedAt
	}

	f.save(id, stored)

	return nil
}

func (f *FakeDirectEliminationRepository) DeleteDirectEliminationByID(
	_ context.Context,
	id uuid.UUID,
) error {
	if f.Err != nil {
		return f.Err
	}

	if _, ok := f.DirectEliminations[id]; !ok {
		return fmt.Errorf("delete direct elimination %s: %w", id, errs.ErrNotFound)
	}

	delete(f.DirectEliminations, id)

	return nil
}

func (f *FakeDirectEliminationRepository) guard(
	id uuid.UUID,
	allowedStatuses []directelimination.DirectEliminationStatus,
) (directelimination.DirectElimination, error) {
	if f.Err != nil {
		return directelimination.DirectElimination{}, f.Err
	}

	stored, ok := f.DirectEliminations[id]
	if !ok {
		return directelimination.DirectElimination{},
			fmt.Errorf("update direct elimination %s: %w", id, errs.ErrNotFound)
	}

	if len(allowedStatuses) > 0 && !slices.Contains(allowedStatuses, stored.Status) {
		return directelimination.DirectElimination{},
			fmt.Errorf("update direct elimination %s: %w", id, errs.ErrConflict)
	}

	return stored, nil
}

func (f *FakeDirectEliminationRepository) save(id uuid.UUID, stored directelimination.DirectElimination) {
	stored.UpdatedAt = time.Now()
	f.DirectEliminations[id] = stored
}
