package event

import (
	"net/http"

	"boutline/internal/features/tournament"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const eventBasePath = "/api/v1/events"

func RegisterEventRoutes(api huma.API, params *types.ServiceParams) {
	RegisterEventService(api, NewEventService(NewEventRepository(params.DB), tournament.NewTournamentRepository(params.DB)))
}

func RegisterEventService(api huma.API, service EventService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createEvent",
		Method:        http.MethodPost,
		Path:          eventBasePath,
		Summary:       "Create an event",
		Tags:          []string{"Events"},
		DefaultStatus: http.StatusCreated,
	}, service.CreateEvent)

	huma.Register(api, huma.Operation{
		OperationID: "listEvents",
		Method:      http.MethodGet,
		Path:        eventBasePath,
		Summary:     "List events",
		Tags:        []string{"Events"},
	}, service.ListEvents)

	huma.Register(api, huma.Operation{
		OperationID: "getEventByID",
		Method:      http.MethodGet,
		Path:        eventBasePath + "/{id}",
		Summary:     "Get an event by ID",
		Tags:        []string{"Events"},
	}, service.GetEventByID)

	huma.Register(api, huma.Operation{
		OperationID: "updateEventByID",
		Method:      http.MethodPatch,
		Path:        eventBasePath + "/{id}",
		Summary:     "Update an event",
		Description: "Only upcoming events can be edited.",
		Tags:        []string{"Events"},
	}, service.UpdateEventByID)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteEventByID",
		Method:        http.MethodDelete,
		Path:          eventBasePath + "/{id}",
		Summary:       "Delete an event",
		Description:   "Only an upcoming event can be deleted.",
		Tags:          []string{"Events"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeleteEventByID)
}
