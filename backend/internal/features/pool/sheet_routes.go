package pool

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const poolSheetBasePath = "/api/v1/pool-sheets"

func RegisterPoolSheetRoutes(api huma.API, params *types.ServiceParams) {
	RegisterPoolSheetService(api, NewPoolSheetService(NewPoolSheetRepository(params.DB)))
}

func RegisterPoolSheetService(api huma.API, service PoolSheetService) {
	huma.Register(api, huma.Operation{
		OperationID: "listPoolSheets",
		Method:      http.MethodGet,
		Path:        poolSheetBasePath,
		Summary:     "List pool sheets",
		Tags:        []string{"Pool Sheets"},
	}, service.ListPoolSheets)

	huma.Register(api, huma.Operation{
		OperationID: "getPoolSheetByID",
		Method:      http.MethodGet,
		Path:        poolSheetBasePath + "/{id}",
		Summary:     "Get a pool sheet by pool ID",
		Tags:        []string{"Pool Sheets"},
	}, service.GetPoolSheetByID)
}
