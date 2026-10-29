package pool

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const poolBoardBasePath = "/api/v1/pool-boards"

func RegisterPoolBoardRoutes(api huma.API, params *types.ServiceParams) {
	RegisterPoolBoardService(api, NewPoolBoardService(NewPoolBoardRepository(params.DB)))
}

func RegisterPoolBoardService(api huma.API, service PoolBoardService) {
	huma.Register(api, huma.Operation{
		OperationID: "listPoolBoards",
		Method:      http.MethodGet,
		Path:        poolBoardBasePath,
		Summary:     "List pool boards",
		Tags:        []string{"Pool Boards"},
	}, service.ListPoolBoards)

	huma.Register(api, huma.Operation{
		OperationID: "getPoolBoardByID",
		Method:      http.MethodGet,
		Path:        poolBoardBasePath + "/{id}",
		Summary:     "Get a pool board by pool ID",
		Tags:        []string{"Pool Boards"},
	}, service.GetPoolBoardByID)
}
