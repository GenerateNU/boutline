package scoring

import "time"

type ScoringResponse struct {
	ID           int64      `json:"id"`
	CreatedBy    string     `json:"created_by" format:"uuid"`
	Points       int        `json:"points" doc:"Points granted for this score"`
	CompetitorID string     `json:"competitor_id" format:"uuid"`
	BoutID       string     `json:"bout_id" format:"uuid"`
	RevokedAt    *time.Time `json:"revoked_at" doc:"Set when a referee revokes the score (soft delete), otherwise null"`
	RevokedBy    *string    `json:"revoked_by" format:"uuid" doc:"Referee who revoked the score, otherwise null"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func newScoringResponse(scoring Scoring) ScoringResponse {
	var revokedBy *string
	if scoring.RevokedBy != nil {
		s := scoring.RevokedBy.String()
		revokedBy = &s
	}

	return ScoringResponse{
		ID:           scoring.ID,
		CreatedBy:    scoring.CreatedBy.String(),
		Points:       scoring.Points,
		CompetitorID: scoring.CompetitorID.String(),
		BoutID:       scoring.BoutID.String(),
		RevokedAt:    scoring.RevokedAt,
		RevokedBy:    revokedBy,
		CreatedAt:    scoring.CreatedAt,
		UpdatedAt:    scoring.UpdatedAt,
	}
}

type ScoringCreateBody struct {
	CreatedBy    string `json:"created_by" format:"uuid" doc:"User recording the score"`
	Points       int    `json:"points,omitempty" default:"1" minimum:"1" doc:"Points granted for this score, defaults to 1"`
	CompetitorID string `json:"competitor_id" format:"uuid" doc:"Competitor who scored"`
	BoutID       string `json:"bout_id" format:"uuid" doc:"Match the score belongs to"`
}

type ScoringCreateInput struct {
	Body ScoringCreateBody
}

type ScoringIDInput struct {
	ID int64 `path:"id" minimum:"1" doc:"Scoring ID"`
}

type ScoringRevokeInput struct {
	ID   int64 `path:"id" minimum:"1" doc:"Scoring ID"`
	Body ScoringRevokeBody
}

type ScoringRevokeBody struct {
	RevokedBy string `json:"revoked_by" format:"uuid" doc:"Referee revoking the score"`
}

type ScoringUpdateBody struct {
	Points       *int    `json:"points,omitempty" minimum:"1" doc:"New points value"`
	CompetitorID *string `json:"competitor_id,omitempty" format:"uuid" doc:"New competitor ID"`
}

type ScoringUpdateInput struct {
	ID   int64 `path:"id" minimum:"1" doc:"Scoring ID"`
	Body ScoringUpdateBody
}

type ScoringListInput struct {
	BoutID         string `path:"bout_id" format:"uuid" doc:"Match ID"`
	IncludeRevoked bool   `query:"include_revoked" default:"false" doc:"Include revoked scores, for replay"`
	Limit          int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset         int    `query:"offset" default:"0" minimum:"0"`
}

type ScoringOutput struct {
	Body ScoringResponse
}

type ScoringListBody struct {
	Data   []ScoringResponse `json:"data"`
	Total  int64             `json:"total" doc:"Scores for the match, ignoring the page"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
}

type ScoringListOutput struct {
	Body ScoringListBody
}

type ScoringHistoryInput struct {
	BoutID string `path:"bout_id" format:"uuid" doc:"Match ID"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type ScoringHistoryEntry struct {
	ID               int64      `json:"id"`
	CompetitorID     string     `json:"competitor_id" format:"uuid"`
	Points           int        `json:"points"`
	CreatedAt        time.Time  `json:"created_at"`
	RevokedAt        *time.Time `json:"revoked_at" doc:"Set when the score was undone; later scores no longer count it"`
	Competitor1Score int        `json:"competitor_1_score" doc:"Competitor 1's total once this score is added to the live scores before it"`
	Competitor2Score int        `json:"competitor_2_score" doc:"Competitor 2's total once this score is added to the live scores before it"`
}

type ScoringHistoryBody struct {
	Data   []ScoringHistoryEntry `json:"data"`
	Total  int64                 `json:"total" doc:"Live scores for the match, ignoring the page"`
	Limit  int                   `json:"limit"`
	Offset int                   `json:"offset"`
}

type ScoringHistoryOutput struct {
	Body ScoringHistoryBody
}
