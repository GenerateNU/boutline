package poolstage

import "time"

type PoolStageResponse struct {
	ID                   string          `json:"id" format:"uuid"`
	EventID              string          `json:"event_id" format:"uuid"`
	MaxCompetitorPerPool int             `json:"max_competitor_per_pool"`
	Status               PoolStageStatus `json:"status" enum:"upcoming,active,ended"`
	StartTime            *time.Time      `json:"start_time" doc:"Scheduled start, if one was set"`
	StartedAt            *time.Time      `json:"started_at" doc:"When the pool stage actually went active"`
	CompletedAt          *time.Time      `json:"completed_at"`
	CreatedAt            time.Time       `json:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at"`
}

func newPoolStageResponse(stage PoolStage) PoolStageResponse {
	return PoolStageResponse{
		ID:                   stage.ID.String(),
		EventID:              stage.EventID.String(),
		MaxCompetitorPerPool: stage.MaxCompetitorPerPool,
		Status:               stage.Status,
		StartTime:            stage.StartTime,
		StartedAt:            stage.StartedAt,
		CompletedAt:          stage.CompletedAt,
		CreatedAt:            stage.CreatedAt,
		UpdatedAt:            stage.UpdatedAt,
	}
}

type PoolStageCreateBody struct {
	EventID              string     `json:"event_id" format:"uuid" doc:"Event this pool stage belongs to"`
	MaxCompetitorPerPool int        `json:"max_competitor_per_pool" minimum:"2" doc:"Largest number of competitors placed in one pool"`
	StartTime            *time.Time `json:"start_time,omitempty" doc:"Scheduled start"`
}

type PoolStageCreateInput struct {
	Body PoolStageCreateBody
}

type PoolStageIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Pool stage ID"`
}

type PoolStageUpdateBody struct {
	MaxCompetitorPerPool *int       `json:"max_competitor_per_pool,omitempty" minimum:"2" doc:"New largest number of competitors in one pool"`
	StartTime            *time.Time `json:"start_time,omitempty" doc:"New scheduled start"`
}

type PoolStageUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Pool stage ID"`
	Body PoolStageUpdateBody
}

// EventID has no format:"uuid" tag because Huma rejects an empty optional
// query string against that format; an empty value is validated by
// utils.ParseUUID only when it is actually set.
type PoolStageListInput struct {
	EventID string          `query:"event_id" doc:"Filter by event"`
	Status  PoolStageStatus `query:"status" enum:"upcoming,active,ended" doc:"Filter by status"`
	Limit   int             `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset  int             `query:"offset" default:"0" minimum:"0"`
}

type PoolStageOutput struct {
	Body PoolStageResponse
}

type PoolStageListBody struct {
	Data   []PoolStageResponse `json:"data"`
	Total  int64               `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int                 `json:"limit"`
	Offset int                 `json:"offset"`
}

type PoolStageListOutput struct {
	Body PoolStageListBody
}

type PoolStageProposalBody struct {
	CompetitorIDs []string `json:"competitor_ids" format:"uuid" minItems:"2" maxItems:"1000" doc:"Competitors to split into pools; each must be entered in the pool stage's tournament"`
}

type PoolStageProposalInput struct {
	ID   string `path:"id" format:"uuid" doc:"Pool stage ID"`
	Body PoolStageProposalBody
}

type PoolStageProposedFencer struct {
	CompetitorID string `json:"competitor_id" format:"uuid"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Rating       string `json:"rating" enum:"A,B,C,D,E,U"`
	Team         string `json:"team"`
}

type PoolStageProposedPool struct {
	Number  int                       `json:"number" doc:"Suggested pool number, from 1"`
	Fencers []PoolStageProposedFencer `json:"fencers" doc:"In seed order"`
}

type PoolStageProposalResult struct {
	Pools []PoolStageProposedPool `json:"pools"`
}

type PoolStageProposalOutput struct {
	Body PoolStageProposalResult
}
