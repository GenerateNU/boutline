package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

var _ tournament.TournamentRepository = (*FakeTournamentRepository)(nil)

type FakeTournamentRepository struct {
	Tournaments map[uuid.UUID]tournament.Tournament
	Err         error // when set, every method fails with it
}

func NewFakeTournamentRepository(seed ...tournament.Tournament) *FakeTournamentRepository {
	tournaments := make(map[uuid.UUID]tournament.Tournament, len(seed))
	for _, seeded := range seed {
		tournaments[seeded.ID] = seeded
	}

	return &FakeTournamentRepository{Tournaments: tournaments}
}

func (f *FakeTournamentRepository) CreateTournament(_ context.Context, toCreate *tournament.Tournament) error {
	if f.Err != nil {
		return f.Err
	}

	for _, existing := range f.Tournaments {
		if existing.Code == toCreate.Code {
			return fmt.Errorf("create tournament: %w", errs.ErrDuplicate)
		}
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Tournaments[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeTournamentRepository) GetTournamentByID(_ context.Context, id uuid.UUID) (*tournament.Tournament, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Tournaments[id]
	if !ok {
		return nil, fmt.Errorf("select tournament %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeTournamentRepository) GetTournamentByCode(_ context.Context, code string) (*tournament.Tournament, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	for _, candidate := range f.Tournaments {
		if candidate.Code == code {
			return &candidate, nil
		}
	}

	return nil, fmt.Errorf("select tournament by code: %w", errs.ErrNotFound)
}

func (f *FakeTournamentRepository) ListTournaments(
	_ context.Context,
	filter tournament.TournamentListFilter,
) ([]tournament.Tournament, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]tournament.Tournament, 0, len(f.Tournaments))
	for _, candidate := range f.Tournaments {
		if filter.Status != "" && candidate.Status != filter.Status {
			continue
		}
		matched = append(matched, candidate)
	}

	slices.SortFunc(matched, func(a, b tournament.Tournament) int {
		return strings.Compare(a.Name, b.Name)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []tournament.Tournament{}, total, nil
	}

	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakeTournamentRepository) EditTournamentByID(
	_ context.Context,
	id uuid.UUID,
	edit tournament.TournamentEdit,
) error {
	stored, err := f.guard(id, tournament.TournamentEditableStatuses())
	if err != nil {
		return err
	}

	if edit.Name != nil {
		stored.Name = *edit.Name
	}
	if edit.Visibility != nil {
		stored.Visibility = *edit.Visibility
	}
	if edit.StartTime != nil {
		stored.StartTime = edit.StartTime
	}

	f.save(id, stored)

	return nil
}

func (f *FakeTournamentRepository) TransitionTournamentByID(
	_ context.Context,
	id uuid.UUID,
	transition tournament.TournamentTransition,
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

func (f *FakeTournamentRepository) guard(
	id uuid.UUID,
	allowedStatuses []tournament.TournamentStatus,
) (tournament.Tournament, error) {
	if f.Err != nil {
		return tournament.Tournament{}, f.Err
	}

	stored, ok := f.Tournaments[id]
	if !ok {
		return tournament.Tournament{}, fmt.Errorf("update tournament %s: %w", id, errs.ErrNotFound)
	}

	if len(allowedStatuses) > 0 && !slices.Contains(allowedStatuses, stored.Status) {
		return tournament.Tournament{}, fmt.Errorf("update tournament %s: %w", id, errs.ErrConflict)
	}

	return stored, nil
}

func (f *FakeTournamentRepository) save(id uuid.UUID, stored tournament.Tournament) {
	stored.UpdatedAt = time.Now()
	f.Tournaments[id] = stored
}
