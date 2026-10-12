package poolstage

import (
	"net/http"

	"boutline/internal/features/event"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const poolStageBasePath = "/api/v1/pool-stages"

func RegisterPoolStageRoutes(api huma.API, params *types.ServiceParams) {
	RegisterPoolStageService(api, NewPoolStageService(NewPoolStageRepository(params.DB), event.NewEventRepository(params.DB)))
}

func RegisterPoolStageService(api huma.API, service PoolStageService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createPoolStage",
		Method:        http.MethodPost,
		Path:          poolStageBasePath,
		Summary:       "Create a pool stage",
		Tags:          []string{"Pool Stages"},
		DefaultStatus: http.StatusCreated,
	}, service.CreatePoolStage)

	huma.Register(api, huma.Operation{
		OperationID: "listPoolStages",
		Method:      http.MethodGet,
		Path:        poolStageBasePath,
		Summary:     "List pool stages",
		Tags:        []string{"Pool Stages"},
	}, service.ListPoolStages)

	huma.Register(api, huma.Operation{
		OperationID: "getPoolStageByID",
		Method:      http.MethodGet,
		Path:        poolStageBasePath + "/{id}",
		Summary:     "Get a pool stage by ID",
		Tags:        []string{"Pool Stages"},
	}, service.GetPoolStageByID)

	huma.Register(api, huma.Operation{
		OperationID: "updatePoolStageByID",
		Method:      http.MethodPatch,
		Path:        poolStageBasePath + "/{id}",
		Summary:     "Update a pool stage",
		Description: "Only upcoming pool stages can be edited.",
		Tags:        []string{"Pool Stages"},
	}, service.UpdatePoolStageByID)

	huma.Register(api, huma.Operation{
		OperationID:   "deletePoolStageByID",
		Method:        http.MethodDelete,
		Path:          poolStageBasePath + "/{id}",
		Summary:       "Delete a pool stage",
		Description:   "Only an upcoming pool stage can be deleted, and only while none of its pools have bouts.",
		Tags:          []string{"Pool Stages"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeletePoolStageByID)
}
