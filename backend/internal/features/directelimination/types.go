package directelimination

import "time"

type DirectEliminationResponse struct {
	ID          string                  `json:"id" format:"uuid"`
	Status      DirectEliminationStatus `json:"status" enum:"upcoming,active,ended" doc:"Lifecycle state of the round"`
	EventID     string                  `json:"event_id" format:"uuid" doc:"Event this direct elimination round belongs to"`
	StartedAt   *time.Time              `json:"started_at" doc:"Set when the round starts, otherwise null"`
	CompletedAt *time.Time              `json:"completed_at" doc:"Set when the round ends, otherwise null"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

func newDirectEliminationResponse(de DirectElimination) DirectEliminationResponse {
	return DirectEliminationResponse{
		ID:          de.ID.String(),
		Status:      de.Status,
		EventID:     de.EventID.String(),
		StartedAt:   de.StartedAt,
		CompletedAt: de.CompletedAt,
		CreatedAt:   de.CreatedAt,
		UpdatedAt:   de.UpdatedAt,
	}
}

type DirectEliminationCreateBody struct {
	EventID string `json:"event_id" format:"uuid" doc:"Event the round belongs to"`
}

type DirectEliminationCreateInput struct {
	Body DirectEliminationCreateBody
}

type DirectEliminationIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Direct elimination ID"`
}

type DirectEliminationUpdateBody struct {
	EventID *string `json:"event_id,omitempty" format:"uuid" doc:"Move the round to a different event"`
}

type DirectEliminationUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Direct elimination ID"`
	Body DirectEliminationUpdateBody
}

type DirectEliminationListInput struct {
	EventID string                  `query:"event_id" format:"uuid" required:"false" doc:"Filter by event ID"`
	Status  DirectEliminationStatus `query:"status" enum:"upcoming,active,ended" required:"false" doc:"Filter by status"`
	Limit   int                     `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset  int                     `query:"offset" default:"0" minimum:"0"`
}

type DirectEliminationOutput struct {
	Body DirectEliminationResponse
}

type DirectEliminationListBody struct {
	Data   []DirectEliminationResponse `json:"data"`
	Total  int64                       `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int                         `json:"limit"`
	Offset int                         `json:"offset"`
}

type DirectEliminationListOutput struct {
	Body DirectEliminationListBody
}
