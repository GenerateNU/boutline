package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"

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

func (f *FakeTournamentRepository) UpdateTournamentByID(
	_ context.Context,
	id uuid.UUID,
	update tournament.TournamentUpdate,
) error {
	stored, err := f.guard(id, tournament.TournamentEditableStatuses())
	if err != nil {
		return err
	}

	if update.Name != nil {
		stored.Name = *update.Name
	}
	if update.Visibility != nil {
		stored.Visibility = *update.Visibility
	}
	if update.StartTime != nil {
		stored.StartTime = update.StartTime
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

var _ tournamentuser.TournamentUserRepository = (*FakeTournamentUserRepository)(nil)

type membershipKey struct {
	TournamentID uuid.UUID
	UserID       uuid.UUID
}

type FakeTournamentUserRepository struct {
	Memberships map[membershipKey]tournamentuser.TournamentUser
	Tournaments map[uuid.UUID]tournament.Tournament
	Err         error
}

func NewFakeTournamentUserRepository(seed ...tournamentuser.TournamentUser) *FakeTournamentUserRepository {
	memberships := make(map[membershipKey]tournamentuser.TournamentUser, len(seed))
	for _, seeded := range seed {
		memberships[keyOf(seeded.TournamentID, seeded.UserID)] = seeded
	}

	return &FakeTournamentUserRepository{
		Memberships: memberships,
		Tournaments: map[uuid.UUID]tournament.Tournament{},
	}
}

func keyOf(tournamentID, userID uuid.UUID) membershipKey {
	return membershipKey{TournamentID: tournamentID, UserID: userID}
}

func (f *FakeTournamentUserRepository) CreateTournamentUser(
	_ context.Context,
	membership *tournamentuser.TournamentUser,
) error {
	if f.Err != nil {
		return f.Err
	}

	key := keyOf(membership.TournamentID, membership.UserID)
	if _, exists := f.Memberships[key]; exists {
		return fmt.Errorf("create tournament user: %w", errs.ErrDuplicate)
	}

	membership.CreatedAt = time.Now()
	membership.UpdatedAt = membership.CreatedAt
	f.Memberships[key] = *membership

	return nil
}

func (f *FakeTournamentUserRepository) GetTournamentUser(
	_ context.Context,
	tournamentID, userID uuid.UUID,
) (*tournamentuser.TournamentUser, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Memberships[keyOf(tournamentID, userID)]
	if !ok {
		return nil, fmt.Errorf("select tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeTournamentUserRepository) ListUsersByTournament(
	_ context.Context,
	tournamentID uuid.UUID,
	limit, offset int,
) ([]tournamentuser.TournamentUser, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	matched := make([]tournamentuser.TournamentUser, 0, len(f.Memberships))
	for _, candidate := range f.Memberships {
		if candidate.TournamentID == tournamentID {
			matched = append(matched, candidate)
		}
	}

	// Ordered by user id, not the repository's created_at, so that iterating a
	// map still yields the same page on every run.
	slices.SortFunc(matched, func(a, b tournamentuser.TournamentUser) int {
		return strings.Compare(a.UserID.String(), b.UserID.String())
	})

	if offset >= len(matched) {
		return []tournamentuser.TournamentUser{}, nil
	}

	matched = matched[offset:]
	if limit < len(matched) {
		matched = matched[:limit]
	}

	return matched, nil
}

func (f *FakeTournamentUserRepository) CountUsersByTournament(
	_ context.Context,
	tournamentID uuid.UUID,
) (int64, error) {
	if f.Err != nil {
		return 0, f.Err
	}

	var total int64
	for _, candidate := range f.Memberships {
		if candidate.TournamentID == tournamentID {
			total++
		}
	}

	return total, nil
}

func (f *FakeTournamentUserRepository) ListTournamentsByUser(
	_ context.Context,
	userID uuid.UUID,
	limit, offset int,
) ([]tournament.Tournament, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]tournament.Tournament, 0, len(f.Memberships))
	for _, candidate := range f.Memberships {
		if candidate.UserID != userID {
			continue
		}
		if joined, ok := f.Tournaments[candidate.TournamentID]; ok {
			matched = append(matched, joined)
		}
	}

	slices.SortFunc(matched, func(a, b tournament.Tournament) int {
		return strings.Compare(a.Name, b.Name)
	})

	total := int64(len(matched))
	if offset >= len(matched) {
		return []tournament.Tournament{}, total, nil
	}

	matched = matched[offset:]
	if limit < len(matched) {
		matched = matched[:limit]
	}

	return matched, total, nil
}

func (f *FakeTournamentUserRepository) UpdateTournamentUserRole(
	_ context.Context,
	tournamentID, userID uuid.UUID,
	role tournamentuser.TournamentUserRole,
) error {
	if f.Err != nil {
		return f.Err
	}

	key := keyOf(tournamentID, userID)
	stored, ok := f.Memberships[key]
	if !ok {
		return fmt.Errorf("update tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
	}

	stored.Role = role
	stored.UpdatedAt = time.Now()
	f.Memberships[key] = stored

	return nil
}

func (f *FakeTournamentUserRepository) DeleteTournamentUser(
	_ context.Context,
	tournamentID, userID uuid.UUID,
) error {
	if f.Err != nil {
		return f.Err
	}

	key := keyOf(tournamentID, userID)
	if _, ok := f.Memberships[key]; !ok {
		return fmt.Errorf("delete tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
	}

	delete(f.Memberships, key)

	return nil
}
