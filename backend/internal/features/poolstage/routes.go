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
		OperationID: "startPoolStage",
		Method:      http.MethodPost,
		Path:        poolStageBasePath + "/{id}/start",
		Summary:     "Start a pool stage",
		Description: "Moves an upcoming pool stage to active and records started_at. The stage needs at least one pool.",
		Tags:        []string{"Pool Stages"},
	}, service.StartPoolStage)

	huma.Register(api, huma.Operation{
		OperationID: "endPoolStage",
		Method:      http.MethodPost,
		Path:        poolStageBasePath + "/{id}/end",
		Summary:     "End a pool stage",
		Description: "Moves an active pool stage to ended and records completed_at. Every pool in the stage must have ended.",
		Tags:        []string{"Pool Stages"},
	}, service.EndPoolStage)

	huma.Register(api, huma.Operation{
		OperationID:   "deletePoolStageByID",
		Method:        http.MethodDelete,
		Path:          poolStageBasePath + "/{id}",
		Summary:       "Delete a pool stage",
		Description:   "Only an upcoming pool stage can be deleted, and only while none of its pools have bouts.",
		Tags:          []string{"Pool Stages"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeletePoolStageByID)

	huma.Register(api, huma.Operation{
		OperationID: "proposePools",
		Method:      http.MethodPost,
		Path:        poolStageBasePath + "/{id}/proposed-pools",
		Summary:     "Propose pools for a pool stage",
		Description: "Splits the given competitors into pools with the seeding algorithm (rating snake, clubmates kept apart) " +
			"and returns the suggestion without saving anything. Send the lists, adjusted as needed, to POST /api/v1/pools.",
		Tags: []string{"Pool Stages"},
	}, service.ProposePools)
}
