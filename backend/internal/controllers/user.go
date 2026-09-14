package controllers

import (
	"context"
	"time"

	"boutline/internal/errs"
	"boutline/internal/models"
	"boutline/internal/services"

	"github.com/google/uuid"
)

type UserController struct {
	service *services.UserService
}

func NewUserController(service *services.UserService) *UserController {
	return &UserController{service: service}
}

// UserResponse is the only shape a user leaves the process in. It has no
// password field, so the hash cannot reach a client, and last_name carries no
// omitempty so the key is always present and reads as null when unset.
type UserResponse struct {
	ID        uuid.UUID `json:"id" format:"uuid"`
	Email     string    `json:"email" format:"email"`
	FirstName string    `json:"first_name"`
	LastName  *string   `json:"last_name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserCreateInput struct {
	Body models.CreateUserRequest
}

type UserOutput struct {
	Body UserResponse
}

func (c *UserController) CreateUser(ctx context.Context, in *UserCreateInput) (*UserOutput, error) {
	user, err := c.service.CreateUser(ctx, in.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	return &UserOutput{Body: newUserResponse(user)}, nil
}

func newUserResponse(u *models.User) UserResponse {
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}
