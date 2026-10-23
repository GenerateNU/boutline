package poolboard

type PoolBoardStanding struct {
	Place           int     `json:"place" doc:"Shared by fencers tied on victory ratio, indicator, and touches scored"`
	Victories       int     `json:"victories"`
	Matches         int     `json:"matches" doc:"Ended bouts fenced"`
	VictoryRatio    float64 `json:"victory_ratio"`
	TouchesScored   int     `json:"touches_scored"`
	TouchesReceived int     `json:"touches_received"`
	Indicator       int     `json:"indicator" doc:"touches_scored minus touches_received"`
}
