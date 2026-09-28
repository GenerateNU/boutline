package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

var _ user.UserRepository = (*FakeUserRepository)(nil)

type FakeUserRepository struct {
	Users map[uuid.UUID]user.User
	Err   error // when set, every method fails with it
}

func NewFakeUserRepository(seed ...user.User) *FakeUserRepository {
	users := make(map[uuid.UUID]user.User, len(seed))
	for _, seeded := range seed {
		users[seeded.ID] = seeded
	}

	return &FakeUserRepository{Users: users}
}

func (f *FakeUserRepository) CreateUser(_ context.Context, toCreate *user.User) error {
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

func (f *FakeUserRepository) ListUsers(
	_ context.Context,
	filter user.UserListFilter,
) ([]user.User, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]user.User, 0, len(f.Users))
	for _, candidate := range f.Users {
		matched = append(matched, candidate)
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

	delete(f.Users, id)

	return nil
}
