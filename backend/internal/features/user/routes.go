package user

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const (
	userBasePath = "/api/v1/users"
	authBasePath = "/api/v1/auth"
)

func RegisterUserRoutes(api huma.API, params *types.ServiceParams) {
	tokens := NewUserTokenManager(params.Config.JWTSecret, UserTokenTTL)
	RegisterUserService(api, NewUserService(NewUserRepository(params.DB), tokens))
}

func RegisterUserService(api huma.API, service UserService) {
	huma.Register(api, huma.Operation{
		OperationID:   "signup",
		Method:        http.MethodPost,
		Path:          authBasePath + "/signup",
		Summary:       "Create a user and issue a bearer token",
		Tags:          []string{"Auth"},
		DefaultStatus: http.StatusCreated,
	}, service.Signup)

	huma.Register(api, huma.Operation{
		OperationID: "login",
		Method:      http.MethodPost,
		Path:        authBasePath + "/login",
		Summary:     "Check an email and password and issue a bearer token",
		Tags:        []string{"Auth"},
	}, service.Login)

	huma.Register(api, huma.Operation{
		OperationID: "listUsers",
		Method:      http.MethodGet,
		Path:        userBasePath,
		Summary:     "List users, optionally fuzzy-matched by name",
		Tags:        []string{"Users"},
	}, service.ListUsers)

	huma.Register(api, huma.Operation{
		OperationID: "getUserByID",
		Method:      http.MethodGet,
		Path:        userBasePath + "/{id}",
		Summary:     "Get a user by ID",
		Tags:        []string{"Users"},
	}, service.GetUserByID)

	huma.Register(api, huma.Operation{
		OperationID: "updateUserByID",
		Method:      http.MethodPatch,
		Path:        userBasePath + "/{id}",
		Summary:     "Update a user",
		Description: "Fields left out of the body are left as they are",
		Tags:        []string{"Users"},
	}, service.UpdateUserByID)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteUser",
		Method:        http.MethodDelete,
		Path:          userBasePath + "/{id}",
		Summary:       "Delete a user",
		Description:   "A user who created a tournament or referees a bout cannot be deleted.",
		Tags:          []string{"Users"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeleteUser)

	huma.Register(api, huma.Operation{
		OperationID: "listTournamentsByUser",
		Method:      http.MethodGet,
		Path:        userBasePath + "/{id}/tournaments",
		Summary:     "List the tournaments a user belongs to",
		Tags:        []string{"Users"},
	}, service.ListTournamentsByUser)
}
