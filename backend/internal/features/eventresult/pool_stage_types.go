package eventresult

import "boutline/internal/features/pool"

type PoolStageResultListInput struct {
	ID     string `path:"id" format:"uuid" doc:"Event ID"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type PoolStageResultResponse struct {
	pool.PoolStanding
	CompetitorID string                `json:"competitor_id" format:"uuid"`
	FirstName    string                `json:"first_name"`
	LastName     string                `json:"last_name"`
	Club         *string               `json:"club" nullable:"true" doc:"Primary club, else team; null when the fencer has neither"`
	Rating       string                `json:"rating" enum:"A,B,C,D,E,U"`
	RatingYear   *int16                `json:"rating_year" nullable:"true" doc:"Two-digit year the rating was earned; null when unknown"`
	PoolNumber   int                   `json:"pool_number"`
	Strip        *string               `json:"strip" nullable:"true" doc:"The fencer's pool's strip; null until assigned"`
	Status       PoolStageResultStatus `json:"status" enum:"pending,advanced,eliminated" doc:"pending until the tableau is drawn, then whether the fencer is in it"`
}

type PoolStageResultListBody struct {
	Data   []PoolStageResultResponse `json:"data" doc:"Ordered by stage-wide place"`
	Total  int64                     `json:"total" doc:"Fencers ranked, ignoring the page"`
	Limit  int                       `json:"limit"`
	Offset int                       `json:"offset"`
}

type PoolStageResultListOutput struct {
	Body PoolStageResultListBody
}

func newPoolStageResultResponse(row PoolStageResultRow) PoolStageResultResponse {
	return PoolStageResultResponse{
		PoolStanding: row.Standing,
		CompetitorID: row.Fencer.CompetitorID.String(),
		FirstName:    row.Fencer.FirstName,
		LastName:     row.Fencer.LastName,
		Club:         row.Fencer.Club,
		Rating:       string(row.Fencer.Rating),
		RatingYear:   row.Fencer.RatingYear,
		PoolNumber:   row.Fencer.PoolNumber,
		Strip:        row.Fencer.Strip,
		Status:       row.Status,
	}
}
