package user

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	UserDefaultPageSize = 20
	UserMinPageSize     = 1
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
	if firstName == "" {
		return nil, errs.HumaError(errs.Public("first name must not be blank", errs.ErrInvalidInput))
	}
	if lastName == "" {
		return nil, errs.HumaError(errs.Public("last name must not be blank", errs.ErrInvalidInput))
	}

	email, err := parseUserEmail(input.Body.Email)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	user := &User{
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
	}
	if err := s.repo.CreateUser(ctx, user); err != nil {
		if errors.Is(err, errs.ErrDuplicate) {
			return nil, errs.HumaError(fmt.Errorf("create user: %w",
				errs.Public(fmt.Sprintf("a user with email %q already exists", email), err)))
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

	if err := s.repo.UpdateUserByID(ctx, id, *update); err != nil {
		if errors.Is(err, errs.ErrDuplicate) {
			return nil, errs.HumaError(fmt.Errorf("update user: %w", err))
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
func userUpdateFrom(body UserUpdateBody) (*UserUpdate, error) {
	var update UserUpdate

	if body.FirstName != nil {
		firstName := strings.TrimSpace(*body.FirstName)
		if firstName == "" {
			return nil, errs.Public("first name must not be blank", errs.ErrInvalidInput)
		}
		update.FirstName = &firstName
	}
	if body.LastName != nil {
		lastName := strings.TrimSpace(*body.LastName)
		if lastName == "" {
			return nil, errs.Public("last name must not be blank", errs.ErrInvalidInput)
		}
		update.LastName = &lastName
	}

	if update.FirstName == nil && update.LastName == nil {
		return nil, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return &update, nil
}

func (s *userService) ListUsers(ctx context.Context, input *UserListInput) (*UserListOutput, error) {
	// TODO: validate fields, perhaps unified but we have to allow some fuzzy searching

	limit := input.Limit
	if limit <= 0 {
		limit = UserDefaultPageSize
	}
	limit = utils.Clamp(limit, UserMinPageSize, UserMaxPageSize)

	offset := max(input.Offset, 0)

	users, total, err := s.repo.ListUsers(ctx, UserListFilter{
		// TODO: decide what filters we want and include them in repository
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

	return &UserListOutput{
			Body: UserListBody{
				Data:   data,
				Total:  total,
				Limit:  limit,
				Offset: offset,
			}},
		nil
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

func parseUserEmail(raw string) (string, error) {
	// Huma validates email format on input
	// but we validate again in case this function is called from outside Huma
	email := strings.TrimSpace(raw)
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return "", errs.Public("email must be a valid address", errs.ErrInvalidInput)
	}

	email = strings.ToLower(addr.Address)
	return email, nil
}
