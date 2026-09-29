package tournamentuser

import (
	"time"

	"boutline/internal/features/tournament"
)

type TournamentUserResponse struct {
	UserID       string             `json:"user_id" format:"uuid"`
	TournamentID string             `json:"tournament_id" format:"uuid"`
	Role         TournamentUserRole `json:"role" enum:"referee,admin"`
	CreatedAt    time.Time          `json:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at"`
}

func newTournamentUserResponse(membership TournamentUser) TournamentUserResponse {
	return TournamentUserResponse{
		UserID:       membership.UserID.String(),
		TournamentID: membership.TournamentID.String(),
		Role:         membership.Role,
		CreatedAt:    membership.CreatedAt,
		UpdatedAt:    membership.UpdatedAt,
	}
}

type TournamentUserAddBody struct {
	UserID string             `json:"user_id" format:"uuid" doc:"User to add to the tournament"`
	Role   TournamentUserRole `json:"role" enum:"referee,admin" doc:"Role the user holds in this tournament"`
}

type TournamentUserAddInput struct {
	TournamentID string `path:"id" format:"uuid" doc:"Tournament ID"`
	Body         TournamentUserAddBody
}

type TournamentUserListInput struct {
	TournamentID string `path:"id" format:"uuid" doc:"Tournament ID"`
	Limit        int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset       int    `query:"offset" default:"0" minimum:"0"`
}

type TournamentUserUpdateRoleBody struct {
	Role TournamentUserRole `json:"role" enum:"referee,admin" doc:"New role for this member"`
}

type TournamentUserUpdateRoleInput struct {
	TournamentID string `path:"id" format:"uuid" doc:"Tournament ID"`
	UserID       string `path:"user_id" format:"uuid" doc:"User ID"`
	Body         TournamentUserUpdateRoleBody
}

type TournamentUserRemoveInput struct {
	TournamentID string `path:"id" format:"uuid" doc:"Tournament ID"`
	UserID       string `path:"user_id" format:"uuid" doc:"User ID"`
}

type TournamentUserTournamentsInput struct {
	UserID string `path:"id" format:"uuid" doc:"User ID"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type TournamentUserOutput struct {
	Body TournamentUserResponse
}

type TournamentUserListBody struct {
	Data   []TournamentUserResponse `json:"data"`
	Total  int64                    `json:"total" doc:"Members of this tournament"`
	Limit  int                      `json:"limit"`
	Offset int                      `json:"offset"`
}

type TournamentUserListOutput struct {
	Body TournamentUserListBody
}

type TournamentUserTournamentsBody struct {
	Data   []tournament.TournamentResponse `json:"data"`
	Total  int64                           `json:"total" doc:"Tournaments this user belongs to"`
	Limit  int                             `json:"limit"`
	Offset int                             `json:"offset"`
}

type TournamentUserTournamentsOutput struct {
	Body TournamentUserTournamentsBody
}
