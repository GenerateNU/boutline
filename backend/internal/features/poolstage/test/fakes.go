package test

import (
	"context"
	"fmt"
	"slices"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/event"
	"boutline/internal/features/poolstage"
	"boutline/internal/features/tournamentuser"
	tournamentusertest "boutline/internal/features/tournamentuser/test"
	"boutline/internal/session"

	"github.com/google/uuid"
)

var _ poolstage.PoolStageRepository = (*FakePoolStageRepository)(nil)

var (
	TestTournamentID = uuid.New()
	TestAdminID      = uuid.New()
	TestRefereeID    = uuid.New()
	testStrangerID   = uuid.New()
)

// Caller is who a request runs as; the zero value is the tournament admin.
type Caller int

const (
	CallerAdmin Caller = iota
	CallerReferee
	CallerNonMember
	CallerNone
)

func (c Caller) Context(ctx context.Context) context.Context {
	switch c {
	case CallerReferee:
		return session.WithUserID(ctx, TestRefereeID)
	case CallerNonMember:
		return session.WithUserID(ctx, testStrangerID)
	case CallerNone:
		return ctx
	default:
		return session.WithUserID(ctx, TestAdminID)
	}
}

func NewTestMemberships() *tournamentusertest.FakeMembershipLookup {
	return tournamentusertest.NewFakeMembershipLookup(
		tournamentuser.TournamentUser{
			TournamentID: TestTournamentID, UserID: TestAdminID, Role: tournamentuser.TournamentUserRoleAdmin,
		},
		tournamentuser.TournamentUser{
			TournamentID: TestTournamentID, UserID: TestRefereeID, Role: tournamentuser.TournamentUserRoleReferee,
		},
	)
}

// PoolCount is a stage's pool tally; a stage with no entry has no pools.
type PoolCount struct{ Total, Open int64 }

type FakePoolStageRepository struct {
	PoolStages  map[uuid.UUID]poolstage.PoolStage
	WithBouts   map[uuid.UUID]bool // stages whose pools have bouts, so a delete is refused
	PoolCounts  map[uuid.UUID]PoolCount
	Competitors map[uuid.UUID]poolstage.PoolStageCompetitor // competitors a proposal can read
	// TournamentID is the tournament every stored stage's event belongs to.
	TournamentID uuid.UUID
	Err          error // when set, every method fails with it
}

func NewFakePoolStageRepository(seed ...poolstage.PoolStage) *FakePoolStageRepository {
	stages := make(map[uuid.UUID]poolstage.PoolStage, len(seed))
	for _, seeded := range seed {
		stages[seeded.ID] = seeded
	}

	return &FakePoolStageRepository{
		PoolStages:  stages,
		WithBouts:   map[uuid.UUID]bool{},
		PoolCounts:  map[uuid.UUID]PoolCount{},
		Competitors: map[uuid.UUID]poolstage.PoolStageCompetitor{},

		TournamentID: TestTournamentID,
	}
}

func (f *FakePoolStageRepository) CreatePoolStage(_ context.Context, toCreate *poolstage.PoolStage) error {
	if f.Err != nil {
		return f.Err
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.PoolStages[toCreate.ID] = *toCreate

	return nil
}

func (f *FakePoolStageRepository) GetPoolStageByID(_ context.Context, id uuid.UUID) (*poolstage.PoolStage, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.PoolStages[id]
	if !ok {
		return nil, fmt.Errorf("select pool stage %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakePoolStageRepository) GetPoolStageTournamentID(_ context.Context, id uuid.UUID) (uuid.UUID, error) {
	if f.Err != nil {
		return uuid.Nil, f.Err
	}

	if _, ok := f.PoolStages[id]; !ok {
		return uuid.Nil, fmt.Errorf("select pool stage %s tournament: %w", id, errs.ErrNotFound)
	}

	return f.TournamentID, nil
}

func (f *FakePoolStageRepository) ListPoolStages(
	_ context.Context,
	filter poolstage.PoolStageListFilter,
) ([]poolstage.PoolStage, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]poolstage.PoolStage, 0, len(f.PoolStages))
	for _, candidate := range f.PoolStages {
		if filter.EventID != nil && candidate.EventID != *filter.EventID {
			continue
		}
		if filter.Status != "" && candidate.Status != filter.Status {
			continue
		}
		matched = append(matched, candidate)
	}

	slices.SortFunc(matched, func(a, b poolstage.PoolStage) int {
		return b.CreatedAt.Compare(a.CreatedAt)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []poolstage.PoolStage{}, total, nil
	}

	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakePoolStageRepository) UpdatePoolStageByID(
	_ context.Context,
	id uuid.UUID,
	update poolstage.PoolStageUpdate,
) error {
	stored, err := f.guard(id, poolstage.PoolStageEditableStatuses())
	if err != nil {
		return err
	}

	if update.MaxCompetitorPerPool != nil {
		stored.MaxCompetitorPerPool = *update.MaxCompetitorPerPool
	}
	if update.StartTime != nil {
		stored.StartTime = update.StartTime
	}

	f.save(id, stored)

	return nil
}

func (f *FakePoolStageRepository) TransitionPoolStageByID(
	_ context.Context,
	id uuid.UUID,
	transition poolstage.PoolStageTransition,
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

func (f *FakePoolStageRepository) CountPoolStagePools(_ context.Context, id uuid.UUID) (int64, int64, error) {
	if f.Err != nil {
		return 0, 0, f.Err
	}

	counts := f.PoolCounts[id]

	return counts.Total, counts.Open, nil
}

func (f *FakePoolStageRepository) DeletePoolStageByID(_ context.Context, id uuid.UUID) error {
	if _, err := f.guard(id, poolstage.PoolStageDeletableStatuses()); err != nil {
		return err
	}

	if f.WithBouts[id] {
		return fmt.Errorf("delete pool stage %s: %w", id,
			errs.Public("a pool stage whose pools have bouts cannot be deleted", errs.ErrConflict))
	}

	delete(f.PoolStages, id)

	return nil
}

func (f *FakePoolStageRepository) ListPoolStageCompetitors(
	_ context.Context,
	competitorIDs []uuid.UUID,
) ([]poolstage.PoolStageCompetitor, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	var competitors []poolstage.PoolStageCompetitor
	for _, id := range competitorIDs {
		if competitor, ok := f.Competitors[id]; ok {
			competitors = append(competitors, competitor)
		}
	}

	return competitors, nil
}

func (f *FakePoolStageRepository) guard(
	id uuid.UUID,
	allowedStatuses []poolstage.PoolStageStatus,
) (poolstage.PoolStage, error) {
	if f.Err != nil {
		return poolstage.PoolStage{}, f.Err
	}

	stored, ok := f.PoolStages[id]
	if !ok {
		return poolstage.PoolStage{}, fmt.Errorf("update pool stage %s: %w", id, errs.ErrNotFound)
	}

	if len(allowedStatuses) > 0 && !slices.Contains(allowedStatuses, stored.Status) {
		return poolstage.PoolStage{}, fmt.Errorf("update pool stage %s: %w", id, errs.ErrConflict)
	}

	return stored, nil
}

func (f *FakePoolStageRepository) save(id uuid.UUID, stored poolstage.PoolStage) {
	stored.UpdatedAt = time.Now()
	f.PoolStages[id] = stored
}

var _ poolstage.EventLookup = (*FakeEventLookup)(nil)

type FakeEventLookup struct {
	Events map[uuid.UUID]event.Event
	Err    error
}

func NewFakeEventLookup(seed ...event.Event) *FakeEventLookup {
	events := make(map[uuid.UUID]event.Event, len(seed))
	for _, seeded := range seed {
		events[seeded.ID] = seeded
	}

	return &FakeEventLookup{Events: events}
}

func (f *FakeEventLookup) GetEventByID(_ context.Context, id uuid.UUID) (*event.Event, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Events[id]
	if !ok {
		return nil, fmt.Errorf("select event %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}
