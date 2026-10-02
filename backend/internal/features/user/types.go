package user

import (
	"time"

	"boutline/internal/features/tournament"
)

type UserResponse struct {
	ID        string    `json:"id" format:"uuid"`
	Email     string    `json:"email"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func newUserResponse(user User) UserResponse {
	return UserResponse{
		ID:        user.ID.String(),
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}
}

type UserIDInput struct {
	ID string `path:"id" format:"uuid" doc:"User ID"`
}

type UserOutput struct {
	Body UserResponse
}

type UserCreateBody struct {
	Email string `json:"email" format:"email" minLength:"1" maxLength:"120" doc:"User email"`
	// Password max length is 72 because that's what bcrypt accepts
	Password  string `json:"password" format:"password" minLength:"1" maxLength:"72" doc:"User password"`
	FirstName string `json:"firstName" minLength:"1" maxLength:"120" doc:"User first name"`
	LastName  string `json:"lastName" minLength:"1" maxLength:"120" doc:"User last name"`
}

type UserCreateInput struct {
	Body UserCreateBody
}

// TODO: user auth (password omitted for now... do we even want to allow password updates?)
type UserUpdateBody struct {
	FirstName *string `json:"firstName,omitempty" minLength:"1" maxLength:"120" doc:"User first name"`
	LastName  *string `json:"lastName,omitempty" minLength:"1" maxLength:"120" doc:"User last name"`
}

type UserUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"User ID"`
	Body UserUpdateBody
}

type UserListInput struct {
	Limit  int `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int `query:"offset" default:"0" minimum:"0"`
}

type UserListBody struct {
	Data   []UserResponse `json:"data"`
	Total  int64          `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type UserListOutput struct {
	Body UserListBody
}

type UserTournamentsInput struct {
	ID     string `path:"id" format:"uuid" doc:"User ID"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type UserTournamentsBody struct {
	Data   []tournament.TournamentResponse `json:"data"`
	Total  int64                           `json:"total" doc:"Tournaments this user belongs to"`
	Limit  int                             `json:"limit"`
	Offset int                             `json:"offset"`
}

type UserTournamentsOutput struct {
	Body UserTournamentsBody
}
