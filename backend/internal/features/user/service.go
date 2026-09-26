package user

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"boutline/internal/errs"

	"github.com/google/uuid"
)

const (
	UserDefaultPageSize = 20
	UserMaxPageSize     = 100
)

type UserService interface {
	CreateUser(ctx context.Context, input *UserCreateInput) (*UserOutput, error)
	GetUserByID(ctx context.Context, input *UserIDInput) (*UserOutput, error)
	ListUsers(ctx context.Context, input *UserListInput) (*UserListOutput, error)
	UpdateUserByID(ctx context.Context, input *UserUpdateInput) (*UserOutput, error)
	DeleteUser(ctx context.Context, input *UserIDInput) (*struct{}, error)
}

type userService struct {
	repo UserRepository
}

func NewUserService(repo UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) CreateUser(ctx context.Context, input *UserCreateInput) (*UserOutput, error) {
	firstName := strings.TrimSpace(input.Body.FirstName)
	lastName := strings.TrimSpace(input.Body.LastName)
	email := strings.TrimSpace(input.Body.Email)
	password := input.Body.Password
	if firstName == "" || lastName == "" || email == "" {
		return nil, errs.HumaError(errs.Public("name must not be blank", errs.ErrInvalidInput))
	}

	user := &User{
		Email:	   email,
		FirstName: firstName,
		LastName:  lastName,
	}
	if err := s.repo.CreateUser(ctx, user); err != nil {
		// The client can act on a name collision, so it gets the detail; the
		// rest of the chain stays in the log.
		if errors.Is(err, errs.ErrDuplicate) {
			return nil, errs.HumaError(fmt.Errorf("create user: %w",
				errs.Public(fmt.Sprintf("an user named %q already exists", name), err)))
		}

		return nil, errs.HumaError(fmt.Errorf("create user: %w", err))
	}

	return &UserOutput{Body: newUserResponse(*user)}, nil
}

func (s *userService) GetUserByID(ctx context.Context, input *UserIDInput) (*UserOutput, error) {
	id, err := parseUserID(input.ID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get user: %w", err))
	}

	return &UserOutput{Body: newUserResponse(*user)}, nil
}

func (s *userService) UpdateUserByID(ctx context.Context, input *UserUpdateInput) (*UserOutput, error) {
	id, err := parseUserID(input.ID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	update, err := userUpdateFrom(input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.UpdateUserByID(ctx, id, update); err != nil {
		if errors.Is(err, errs.ErrDuplicate) {
			return nil, errs.HumaError(fmt.Errorf("update user: %w",
				errs.Public(fmt.Sprintf("an user named %q already exists", *update.Name), err)))
		}

		return nil, errs.HumaError(fmt.Errorf("update user: %w", err))
	}

	// Updates writes columns, not rows, so the response comes from a read of
	// what is now stored rather than from the patch.
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated user: %w", err))
	}

	return &UserOutput{Body: newUserResponse(*user)}, nil
}

// userUpdateFrom applies the same rules as create to whichever fields the
// patch actually carries, and refuses a patch that would change nothing.
func userUpdateFrom(body UserUpdateBody) (UserUpdate, error) {
	var update UserUpdate

	if body.Name != nil {
		name := strings.TrimSpace(*body.Name)
		if name == "" {
			return update, errs.Public("name must not be blank", errs.ErrInvalidInput)
		}
		update.Name = &name
	}

	if body.Status != nil {
		if !body.Status.IsValid() {
			return update, errs.Public(
				fmt.Sprintf("unknown status %q", *body.Status), errs.ErrInvalidInput)
		}
		update.Status = body.Status
	}

	if update.Name == nil && update.Status == nil {
		return update, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return update, nil
}

func (s *userService) ListUsers(ctx context.Context, input *UserListInput) (*UserListOutput, error) {
	if input.Status != "" && !input.Status.IsValid() {
		return nil, errs.HumaError(
			errs.Public(fmt.Sprintf("unknown status %q", input.Status), errs.ErrInvalidInput))
	}

	// Clamped rather than trusted: Huma enforces the bounds on an HTTP request,
	// but a job calling this method directly gets a bounded page too.
	limit := input.Limit
	switch {
	case limit <= 0:
		limit = UserDefaultPageSize
	case limit > UserMaxPageSize:
		limit = UserMaxPageSize
	}

	offset := max(input.Offset, 0)

	users, total, err := s.repo.ListUsers(ctx, UserListFilter{
		Status: input.Status,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list users: %w", err))
	}

	data := make([]UserResponse, 0, len(users))
	for _, user := range users {
		data = append(data, newUserResponse(user))
	}

	// The clamped values, not what was asked for, so the caller can tell which
	// page it actually got.
	return &UserListOutput{Body: UserListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *userService) DeleteUser(ctx context.Context, input *UserIDInput) (*struct{}, error) {
	id, err := parseUserID(input.ID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeleteUser(ctx, id); err != nil {
		return nil, errs.HumaError(fmt.Errorf("delete user: %w", err))
	}

	return nil, nil
}

func parseUserID(raw string) (uuid.UUID, error) {
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, fmt.Errorf("parse user id %q: %w", raw, errs.ErrInvalidInput)
	}

	return id, nil
}