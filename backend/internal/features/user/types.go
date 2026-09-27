package user

import "time"

type UserResponse struct {
	ID        string        `json:"id" format:"uuid"`
	Email     string		`json:"email"`
	FirstName string        `json:"firstName"`
	LastName  string        `json:"lastName"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
}

func newUserResponse(user User) UserResponse {
	return UserResponse{
		ID:        user.ID.String(),
		Email:	   user.Email,
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
	Email     string        `json:"email" format:"email" minLength:"1" maxLength:"120" doc:"User email"`
	Password  string        `json:"password" minLength:"1" maxLength:"120" doc:"User password, hashed"`
	FirstName string        `json:"firstName" minLength:"1" maxLength:"120" doc:"User first name"`
	LastName  string        `json:"lastName" minLength:"1" maxLength:"120" doc:"User last name"`
}

type UserCreateInput struct {
	Body UserCreateBody
}

type UserUpdateBody struct {
	Email     *string        `json:"email,omitempty" format:"email" minLength:"1" maxLength:"120" doc:"User email"`
	Password  *string        `json:"password,omitempty" minLength:"1" maxLength:"120" doc:"User password, hashed"`
	FirstName *string        `json:"firstName,omitempty" minLength:"1" maxLength:"120" doc:"User first name"`
	LastName  *string        `json:"lastName,omitempty" minLength:"1" maxLength:"120" doc:"User last name"`
}

type UserUpdateInput struct {
	ID   string 			`path:"id" format:"uuid" doc:"User ID"`
	Body UserUpdateBody
}

type UserListInput struct {
	Limit  int           `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int           `query:"offset" default:"0" minimum:"0"`
}

type UserListBody struct {
	Data   []UserResponse    `json:"data"`
	Total  int64             `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
}

type UserListOutput struct {
	Body UserListBody
}