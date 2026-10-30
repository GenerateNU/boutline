package tableau

type TableauInput struct {
	ID string `path:"id" format:"uuid" doc:"Event ID"`
}

type FencerResponse struct {
	ID        string `json:"id" format:"uuid"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Club      string `json:"club"`
	Seed      int    `json:"seed"`
}

type TableauBoutResponse struct {
	ID          string         `json:"id" format:"uuid"`
	Slot        int            `json:"slot" doc:"1-based position in the round, top to bottom"`
	Top         FencerResponse `json:"top"`
	Bottom      FencerResponse `json:"bottom"`
	TopScore    *int           `json:"top_score" nullable:"true" doc:"Null until the bout has started"`
	BottomScore *int           `json:"bottom_score" nullable:"true" doc:"Null until the bout has started"`
}

type RoundResponse struct {
	Size  int                   `json:"size" doc:"Fencers in the round; 2 is the final"`
	Bouts []TableauBoutResponse `json:"bouts"`
}

type TableauBody struct {
	Rounds []RoundResponse `json:"rounds" doc:"Largest round first; empty until a tableau is drawn"`
}

type TableauOutput struct {
	Body TableauBody
}
