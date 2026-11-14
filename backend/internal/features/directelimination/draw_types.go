package directelimination

type DirectEliminationGenerateBody struct {
	AdvancePercent   int `json:"advance_percent,omitempty" default:"100" minimum:"1" maximum:"100" doc:"Share of the pool ranking that advances; fencers tied at the cut line all advance"`
	PointsToWin      int `json:"points_to_win,omitempty" default:"15" minimum:"1" doc:"Touches to win each first-round bout"`
	TimeLimitSeconds int `json:"time_limit_seconds,omitempty" default:"180" minimum:"1" doc:"Time limit of each first-round bout"`
}

type DirectEliminationGenerateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Direct elimination ID"`
	Body DirectEliminationGenerateBody
}

type DirectEliminationDrawEntry struct {
	CompetitorID string `json:"competitor_id" format:"uuid"`
	Seed         int    `json:"seed" doc:"1 is the top seed"`
}

type DirectEliminationDrawBout struct {
	ID            string `json:"id" format:"uuid"`
	RoundSize     int    `json:"round_size" doc:"Bracket size of the round this bout is in"`
	Slot          int    `json:"slot" doc:"Position in the round, from 1; slots without a bout are byes"`
	Competitor1ID string `json:"competitor_1_id" format:"uuid" doc:"The higher seed"`
	Competitor2ID string `json:"competitor_2_id" format:"uuid"`
}

type DirectEliminationDrawResponse struct {
	DirectEliminationID string                       `json:"direct_elimination_id" format:"uuid"`
	BracketSize         int                          `json:"bracket_size"`
	Entries             []DirectEliminationDrawEntry `json:"entries" doc:"Ordered by seed"`
	Bouts               []DirectEliminationDrawBout  `json:"bouts" doc:"First round, ordered by slot"`
}

type DirectEliminationDrawOutput struct {
	Body DirectEliminationDrawResponse
}

func newDirectEliminationDrawResponse(
	id string,
	size int,
	entries []DrawEntry,
	bouts []DrawBout,
) DirectEliminationDrawResponse {
	response := DirectEliminationDrawResponse{
		DirectEliminationID: id,
		BracketSize:         size,
		Entries:             make([]DirectEliminationDrawEntry, 0, len(entries)),
		Bouts:               make([]DirectEliminationDrawBout, 0, len(bouts)),
	}
	for _, entry := range entries {
		response.Entries = append(response.Entries, DirectEliminationDrawEntry{
			CompetitorID: entry.CompetitorID.String(),
			Seed:         entry.Seed,
		})
	}
	for _, bout := range bouts {
		response.Bouts = append(response.Bouts, DirectEliminationDrawBout{
			ID:            bout.ID.String(),
			RoundSize:     bout.RoundSize,
			Slot:          bout.Slot,
			Competitor1ID: bout.Competitor1ID.String(),
			Competitor2ID: bout.Competitor2ID.String(),
		})
	}

	return response
}
