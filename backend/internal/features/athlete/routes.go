package athlete

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const athleteBasePath = "/api/v1/athletes"

const publicOnlyNote = "Only entries from public, ended tournaments are included."

func RegisterAthleteRoutes(api huma.API, params *types.ServiceParams) {
	RegisterAthleteService(api, NewAthleteService(NewAthleteRepository(params.DB)))
}

func RegisterAthleteService(api huma.API, service AthleteService) {
	huma.Register(api, huma.Operation{
		OperationID: "searchAthletes",
		Method:      http.MethodGet,
		Path:        athleteBasePath,
		Summary:     "Search athletes by name",
		Description: publicOnlyNote,
		Tags:        []string{"Athletes"},
	}, service.SearchAthletes)

	huma.Register(api, huma.Operation{
		OperationID: "getAthleteByID",
		Method:      http.MethodGet,
		Path:        athleteBasePath + "/{id}",
		Summary:     "Get an athlete profile",
		Description: publicOnlyNote + " An athlete with no such entries is not found.",
		Tags:        []string{"Athletes"},
	}, service.GetAthleteByID)

	huma.Register(api, huma.Operation{
		OperationID: "listAthleteCompetitors",
		Method:      http.MethodGet,
		Path:        athleteBasePath + "/{id}/competitors",
		Summary:     "List an athlete's public tournament history",
		Description: publicOnlyNote,
		Tags:        []string{"Athletes"},
	}, service.ListAthleteCompetitors)
}
