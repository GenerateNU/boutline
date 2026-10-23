package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/tournament"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

var _ user.UserRepository = (*FakeUserRepository)(nil)

type FakeUserRepository struct {
	Users map[uuid.UUID]user.User
	// Tournaments each user belongs to, in seed order.
	Joined map[uuid.UUID][]tournament.Tournament
	// Users a tournament or bout still points at, which the database refuses to delete.
	Referenced map[uuid.UUID]bool
	Err        error // when set, every method fails with it
}

// newTestTokens signs with a fixed secret so a test can parse back the tokens
// the service issues.
func newTestTokens() *user.UserTokenManager {
	return user.NewUserTokenManager("user-feature-test-jwt-secret-of-32-bytes+", user.UserTokenTTL)
}

func NewFakeUserRepository(seed ...user.User) *FakeUserRepository {
	users := make(map[uuid.UUID]user.User, len(seed))
	for _, seeded := range seed {
		users[seeded.ID] = seeded
	}

	return &FakeUserRepository{Users: users, Joined: map[uuid.UUID][]tournament.Tournament{}}
}

func (f *FakeUserRepository) SignupUser(_ context.Context, toCreate *user.User) error {
	if f.Err != nil {
		return f.Err
	}

	for _, existing := range f.Users {
		if existing.Email == toCreate.Email {
			return fmt.Errorf("insert user: %w", errs.ErrDuplicate)
		}
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Users[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeUserRepository) GetUserByID(_ context.Context, id uuid.UUID) (*user.User, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Users[id]
	if !ok {
		return nil, fmt.Errorf("select user %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeUserRepository) LoginUser(_ context.Context, email string) (*user.User, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	email = strings.ToLower(strings.TrimSpace(email))
	for _, candidate := range f.Users {
		if candidate.Email == email {
			found := candidate
			return &found, nil
		}
	}

	return nil, fmt.Errorf("select login user: %w", errs.ErrNotFound)
}

func (f *FakeUserRepository) ListUsers(
	_ context.Context,
	filter user.UserListFilter,
) ([]user.User, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	term := strings.ToLower(filter.Term)
	matched := make([]user.User, 0, len(f.Users))
	for _, candidate := range f.Users {
		name := strings.ToLower(candidate.FirstName + " " + candidate.LastName)
		if strings.Contains(name, term) {
			matched = append(matched, candidate)
		}
	}

	// Ordered by email, not the repository's created_at, so that iterating a
	// map still yields the same page on every run.
	slices.SortFunc(matched, func(a, b user.User) int {
		return strings.Compare(a.Email, b.Email)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []user.User{}, total, nil
	}

	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakeUserRepository) UpdateUserByID(
	_ context.Context,
	id uuid.UUID,
	update user.UserUpdate,
) error {
	if f.Err != nil {
		return f.Err
	}

	stored, ok := f.Users[id]
	if !ok {
		return fmt.Errorf("update user %s: %w", id, errs.ErrNotFound)
	}

	if update.FirstName != nil {
		stored.FirstName = *update.FirstName
	}
	if update.LastName != nil {
		stored.LastName = *update.LastName
	}

	stored.UpdatedAt = time.Now()
	f.Users[id] = stored

	return nil
}

func (f *FakeUserRepository) DeleteUser(_ context.Context, id uuid.UUID) error {
	if f.Err != nil {
		return f.Err
	}

	if _, ok := f.Users[id]; !ok {
		return fmt.Errorf("delete user %s: %w", id, errs.ErrNotFound)
	}
	if f.Referenced[id] {
		return fmt.Errorf("delete user %s: %w", id,
			errs.Public("a user who created a tournament, referees a bout, or created or revoked a score cannot be deleted", errs.ErrConflict))
	}

	delete(f.Users, id)

	return nil
}

func (f *FakeUserRepository) ListTournamentsByUser(
	_ context.Context,
	userID uuid.UUID,
	limit, offset int,
) ([]tournament.Tournament, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	joined := f.Joined[userID]
	total := int64(len(joined))
	if offset >= len(joined) {
		return []tournament.Tournament{}, total, nil
	}

	return slices.Clone(joined[offset:min(offset+limit, len(joined))]), total, nil
}
