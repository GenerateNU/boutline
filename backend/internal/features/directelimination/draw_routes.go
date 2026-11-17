package directelimination

import (
	"math/rand/v2"
	"net/http"

	"boutline/internal/features/tournamentuser"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func RegisterDirectEliminationDrawRoutes(api huma.API, params *types.ServiceParams) {
	newRNG := func() *rand.Rand { return rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64())) }
	RegisterDrawService(api, NewDrawService(
		NewDrawRepository(params.DB), tournamentuser.NewTournamentUserRepository(params.DB), newRNG))
}

func RegisterDrawService(api huma.API, service DrawService) {
	huma.Register(api, huma.Operation{
		OperationID: "generateDirectElimination",
		Method:      http.MethodPost,
		Path:        directEliminationBasePath + "/{id}/generate",
		Summary:     "Draw a direct elimination tableau",
		Description: "Tournament admin only. Only while the round is upcoming and once the event's pool stage has ended. " +
			"Applies the advance_percent cut to the pool ranking and breaks ties at random. " +
			"Writes the seeded entries and the first-round bouts.",
		Tags: []string{"Direct Eliminations"},
	}, service.GenerateDirectElimination)
}
