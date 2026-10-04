package competitor

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const competitorBasePath = "/api/v1/competitors"

func RegisterCompetitorRoutes(api huma.API, params *types.ServiceParams) {
	RegisterCompetitorService(api, NewCompetitorService(NewCompetitorRepository(params.DB)))
}

func RegisterCompetitorService(api huma.API, service CompetitorService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createCompetitor",
		Method:        http.MethodPost,
		Path:          competitorBasePath,
		Summary:       "Create a competitor",
		Tags:          []string{"Competitors"},
		DefaultStatus: http.StatusCreated,
	}, service.CreateCompetitor)

	huma.Register(api, huma.Operation{
		OperationID: "listCompetitors",
		Method:      http.MethodGet,
		Path:        competitorBasePath,
		Summary:     "List competitors",
		Tags:        []string{"Competitors"},
	}, service.ListCompetitors)

	huma.Register(api, huma.Operation{
		OperationID: "getCompetitorByID",
		Method:      http.MethodGet,
		Path:        competitorBasePath + "/{id}",
		Summary:     "Get a competitor by ID",
		Tags:        []string{"Competitors"},
	}, service.GetCompetitorByID)

	huma.Register(api, huma.Operation{
		OperationID: "updateCompetitorByID",
		Method:      http.MethodPatch,
		Path:        competitorBasePath + "/{id}",
		Summary:     "Update a competitor",
		Description: "Fields left out of the body are left as they are",
		Tags:        []string{"Competitors"},
	}, service.UpdateCompetitorByID)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteCompetitor",
		Method:        http.MethodDelete,
		Path:          competitorBasePath + "/{id}",
		Summary:       "Delete a competitor",
		Tags:          []string{"Competitors"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeleteCompetitor)
}