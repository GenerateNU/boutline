package directelimination

import "time"

type Status string

const (
	StatusUpcoming Status = "upcoming"
	StatusActive   Status = "active"
	StatusEnd      Status = "end"
)

type DirectEliminationResponse struct {
	ID          string     `json:"id" format:"uuid"`
	Status      Status     `json:"status" enum:"upcoming,active,end" doc:"Lifecycle state of the round"`
	EventID     string     `json:"event_id" format:"uuid" doc:"Event this direct elimination round belongs to"`
	StartedAt   *time.Time `json:"started_at" doc:"Set when the round starts, otherwise null"`
	CompletedAt *time.Time `json:"completed_at" doc:"Set when the round ends, otherwise null"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
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
	Status  Status `json:"status,omitempty" enum:"upcoming,active,end" default:"upcoming" doc:"Initial status, defaults to upcoming"`
}

type DirectEliminationCreateInput struct {
	Body DirectEliminationCreateBody
}

type DirectEliminationIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Direct elimination ID"`
}

type DirectEliminationUpdateBody struct {
	Status      *Status    `json:"status,omitempty" enum:"upcoming,active,end" doc:"New status"`
	StartedAt   *time.Time `json:"started_at,omitempty" doc:"Override when the round started"`
	CompletedAt *time.Time `json:"completed_at,omitempty" doc:"Override when the round completed"`
}

type DirectEliminationUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Direct elimination ID"`
	Body DirectEliminationUpdateBody
}

type DirectEliminationListInput struct {
	EventID string `query:"event_id" format:"uuid" required:"false" doc:"Filter by event ID"`
	Status  Status `query:"status" enum:"upcoming,active,end" required:"false" doc:"Filter by status"`
}

type DirectEliminationOutput struct {
	Body DirectEliminationResponse
}

type DirectEliminationListBody struct {
	Data  []DirectEliminationResponse `json:"data"`
	Total int64                       `json:"total" doc:"Direct elimination rounds returned"`
}

type DirectEliminationListOutput struct {
	Body DirectEliminationListBody
}
