package user

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const userBasePath = "/api/v1/users"

func RegisterUserRoutes(api huma.API, params *types.ServiceParams) {
	RegisterUserService(api, NewUserService(NewUserRepository(params.DB)))
}

func RegisterUserService(api huma.API, service UserService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createUser",
		Method:        http.MethodPost,
		Path:          userBasePath,
		Summary:       "Create a user",
		Tags:          []string{"Users"},
		DefaultStatus: http.StatusCreated,
	}, service.CreateUser)

	huma.Register(api, huma.Operation{
		OperationID: "listUsers",
		Method:      http.MethodGet,
		Path:        userBasePath,
		Summary:     "List users",
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
		Tags:          []string{"Users"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeleteUser)
}
