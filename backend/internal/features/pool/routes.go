package pool

import (
	"net/http"

	"boutline/internal/features/poolstage"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const poolBasePath = "/api/v1/pools"

func RegisterPoolRoutes(api huma.API, params *types.ServiceParams) {
	RegisterPoolService(api, NewPoolService(NewPoolRepository(params.DB), poolstage.NewPoolStageRepository(params.DB)))
}

func RegisterPoolService(api huma.API, service PoolService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createPool",
		Method:        http.MethodPost,
		Path:          poolBasePath,
		Summary:       "Create a pool",
		Tags:          []string{"Pools"},
		DefaultStatus: http.StatusCreated,
	}, service.CreatePool)

	huma.Register(api, huma.Operation{
		OperationID: "listPools",
		Method:      http.MethodGet,
		Path:        poolBasePath,
		Summary:     "List pools",
		Tags:        []string{"Pools"},
	}, service.ListPools)

	huma.Register(api, huma.Operation{
		OperationID: "getPoolByID",
		Method:      http.MethodGet,
		Path:        poolBasePath + "/{id}",
		Summary:     "Get a pool by ID",
		Tags:        []string{"Pools"},
	}, service.GetPoolByID)

	huma.Register(api, huma.Operation{
		OperationID: "updatePoolByID",
		Method:      http.MethodPatch,
		Path:        poolBasePath + "/{id}",
		Summary:     "Update a pool",
		Tags:        []string{"Pools"},
	}, service.UpdatePoolByID)

	huma.Register(api, huma.Operation{
		OperationID:   "deletePoolByID",
		Method:        http.MethodDelete,
		Path:          poolBasePath + "/{id}",
		Summary:       "Delete a pool",
		Description:   "A pool that still has bouts cannot be deleted.",
		Tags:          []string{"Pools"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeletePoolByID)
}
