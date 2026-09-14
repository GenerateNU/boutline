package routers

import (
	"net/http"

	"boutline/internal/controllers"
	"boutline/internal/services"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func RegisterUserRoutes(api huma.API, params *types.ServiceParams) {
	RegisterUserController(api, controllers.NewUserController(
		services.NewUserService(params.Repository.User),
	))
}

// RegisterUserController mounts an already-built controller so a test can
// register one over an in-memory repository.
func RegisterUserController(api huma.API, controller *controllers.UserController) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-user",
		Method:        http.MethodPost,
		Path:          "/api/v1/users",
		Summary:       "Create a user",
		Tags:          []string{"Users"},
		DefaultStatus: http.StatusCreated,
	}, controller.CreateUser)
}
