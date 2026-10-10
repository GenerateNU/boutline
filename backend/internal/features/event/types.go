package event

import "time"

type EventResponse struct {
	ID           string      `json:"id" format:"uuid"`
	TournamentID string      `json:"tournament_id" format:"uuid"`
	Format       EventFormat `json:"format"`
	Name         string      `json:"name"`
	Status       EventStatus `json:"status" enum:"upcoming,active,ended"`
	StartTime    *time.Time  `json:"start_time" doc:"Scheduled start, if one was set"`
	StartedAt    *time.Time  `json:"started_at" doc:"When the event actually went active"`
	CompletedAt  *time.Time  `json:"completed_at"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

func newEventResponse(event Event) EventResponse {
	return EventResponse{
		ID:           event.ID.String(),
		TournamentID: event.TournamentID.String(),
		Format:       event.Format,
		Name:         event.Name,
		Status:       event.Status,
		StartTime:    event.StartTime,
		StartedAt:    event.StartedAt,
		CompletedAt:  event.CompletedAt,
		CreatedAt:    event.CreatedAt,
		UpdatedAt:    event.UpdatedAt,
	}
}

type EventCreateBody struct {
	TournamentID string     `json:"tournament_id" format:"uuid" doc:"Tournament this event belongs to"`
	Name         string     `json:"name" minLength:"1" maxLength:"200"`
	StartTime    *time.Time `json:"start_time,omitempty" doc:"Scheduled start"`
}

type EventCreateInput struct {
	Body EventCreateBody
}

type EventIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Event ID"`
}

type EventUpdateBody struct {
	Name      *string    `json:"name,omitempty" minLength:"1" maxLength:"200"`
	StartTime *time.Time `json:"start_time,omitempty" doc:"New scheduled start"`
}

type EventUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Event ID"`
	Body EventUpdateBody
}

// TournamentID has no format:"uuid" tag because Huma rejects an empty
// optional query string against that format; an empty value is validated by
// utils.ParseUUID only when it is actually set.
type EventListInput struct {
	TournamentID string      `query:"tournament_id" doc:"Filter by tournament"`
	Status       EventStatus `query:"status" enum:"upcoming,active,ended" doc:"Filter by status"`
	Limit        int         `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset       int         `query:"offset" default:"0" minimum:"0"`
}

type EventOutput struct {
	Body EventResponse
}

type EventListBody struct {
	Data   []EventResponse `json:"data"`
	Total  int64           `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int             `json:"limit"`
	Offset int             `json:"offset"`
}

type EventListOutput struct {
	Body EventListBody
}
