package athlete

type AthleteResponse struct {
	ID        string `json:"id" format:"uuid"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Claimed   bool   `json:"claimed"`
}

type AthleteHistoryEntryResponse struct {
	CompetitorID   string  `json:"competitorId" format:"uuid"`
	TournamentID   string  `json:"tournamentId" format:"uuid"`
	TournamentName string  `json:"tournamentName"`
	EventID        string  `json:"eventId" format:"uuid"`
	Rating         string  `json:"rating" enum:"A,B,C,D,E,U"`
	Club           *string `json:"club" nullable:"true"`
}

type AthleteIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Athlete ID"`
}

type AthleteOutput struct {
	Body AthleteResponse
}

type AthleteHistoryInput struct {
	ID     string `path:"id" format:"uuid" doc:"Athlete ID"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type AthleteHistoryBody struct {
	Data   []AthleteHistoryEntryResponse `json:"data"`
	Total  int64                         `json:"total"`
	Limit  int                           `json:"limit"`
	Offset int                           `json:"offset"`
}

type AthleteHistoryOutput struct {
	Body AthleteHistoryBody
}

type AthleteSearchInput struct {
	Query  string `query:"q" required:"true" minLength:"1" maxLength:"120" doc:"Fuzzy match against the athlete's name"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type AthleteListBody struct {
	Data   []AthleteResponse `json:"data"`
	Total  int64             `json:"total"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
}

type AthleteListOutput struct {
	Body AthleteListBody
}
