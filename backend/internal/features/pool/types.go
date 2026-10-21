package pool

import "time"

type PoolResponse struct {
	ID          string     `json:"id" format:"uuid"`
	PoolStageID string     `json:"pool_stage_id" format:"uuid"`
	RefereeID   *string    `json:"referee_id" format:"uuid" doc:"Null until a referee is assigned"`
	StartedAt   *time.Time `json:"started_at" doc:"When the pool actually started"`
	CompletedAt *time.Time `json:"completed_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func newPoolResponse(pool Pool) PoolResponse {
	var refereeID *string
	if pool.RefereeID != nil {
		id := pool.RefereeID.String()
		refereeID = &id
	}

	return PoolResponse{
		ID:          pool.ID.String(),
		PoolStageID: pool.PoolStageID.String(),
		RefereeID:   refereeID,
		StartedAt:   pool.StartedAt,
		CompletedAt: pool.CompletedAt,
		CreatedAt:   pool.CreatedAt,
		UpdatedAt:   pool.UpdatedAt,
	}
}

type PoolCreateBody struct {
	PoolStageID string  `json:"pool_stage_id" format:"uuid" doc:"Pool stage this pool belongs to"`
	RefereeID   *string `json:"referee_id,omitempty" format:"uuid" doc:"Can be assigned later"`
}

type PoolCreateInput struct {
	Body PoolCreateBody
}

type PoolIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Pool ID"`
}

type PoolUpdateBody struct {
	RefereeID *string `json:"referee_id,omitempty" format:"uuid" doc:"Referee to assign to the pool"`
}

type PoolUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Pool ID"`
	Body PoolUpdateBody
}

// PoolStageID has no format:"uuid" tag because Huma rejects an empty optional
// query string against that format; an empty value is validated by
// utils.ParseUUID only when it is actually set.
type PoolListInput struct {
	PoolStageID string `query:"pool_stage_id" doc:"Filter by pool stage"`
	Limit       int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset      int    `query:"offset" default:"0" minimum:"0"`
}

type PoolOutput struct {
	Body PoolResponse
}

type PoolListBody struct {
	Data   []PoolResponse `json:"data"`
	Total  int64          `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type PoolListOutput struct {
	Body PoolListBody
}
