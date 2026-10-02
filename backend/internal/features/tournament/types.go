package tournament

import (
	"time"

	"boutline/internal/features/tournamentuser"
)

type TournamentResponse struct {
	ID          string               `json:"id" format:"uuid"`
	Name        string               `json:"name"`
	Visibility  TournamentVisibility `json:"visibility" enum:"private,public"`
	Code        string               `json:"code" doc:"Join code, always uppercase"`
	Status      TournamentStatus     `json:"status" enum:"pending,active,end"`
	CreatedBy   string               `json:"created_by" format:"uuid"`
	StartTime   *time.Time           `json:"start_time" doc:"Scheduled start, if one was set"`
	StartedAt   *time.Time           `json:"started_at" doc:"When the tournament actually went active"`
	CompletedAt *time.Time           `json:"completed_at"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

func NewTournamentResponse(tournament Tournament) TournamentResponse {
	return TournamentResponse{
		ID:          tournament.ID.String(),
		Name:        tournament.Name,
		Visibility:  tournament.Visibility,
		Code:        tournament.Code,
		Status:      tournament.Status,
		CreatedBy:   tournament.CreatedBy.String(),
		StartTime:   tournament.StartTime,
		StartedAt:   tournament.StartedAt,
		CompletedAt: tournament.CompletedAt,
		CreatedAt:   tournament.CreatedAt,
		UpdatedAt:   tournament.UpdatedAt,
	}
}

type TournamentCreateBody struct {
	Name       string               `json:"name" minLength:"1" maxLength:"120" doc:"Display name for the tournament"`
	Visibility TournamentVisibility `json:"visibility,omitempty" enum:"private,public" doc:"Defaults to private"`
	CreatedBy  string               `json:"created_by" format:"uuid" doc:"User creating the tournament"`
	StartTime  *time.Time           `json:"start_time,omitempty" doc:"Scheduled start"`
}

type TournamentCreateInput struct {
	Body TournamentCreateBody
}

type TournamentIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Tournament ID"`
}

type TournamentCodeInput struct {
	Code string `path:"code" minLength:"6" doc:"Join code, case-insensitive"`
}

type TournamentUpdateBody struct {
	Name       *string               `json:"name,omitempty" minLength:"1" maxLength:"120" doc:"New name"`
	Visibility *TournamentVisibility `json:"visibility,omitempty" enum:"private,public" doc:"New visibility"`
	StartTime  *time.Time            `json:"start_time,omitempty" doc:"New scheduled start"`
}

type TournamentUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Tournament ID"`
	Body TournamentUpdateBody
}

type TournamentListInput struct {
	Status TournamentStatus `query:"status" enum:"pending,active,end" doc:"Filter by status"`
	Limit  int              `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int              `query:"offset" default:"0" minimum:"0"`
}

type TournamentOutput struct {
	Body TournamentResponse
}

type TournamentListBody struct {
	Data   []TournamentResponse `json:"data"`
	Total  int64                `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int                  `json:"limit"`
	Offset int                  `json:"offset"`
}

type TournamentListOutput struct {
	Body TournamentListBody
}

type TournamentUserResponse struct {
	UserID       string                            `json:"user_id" format:"uuid"`
	TournamentID string                            `json:"tournament_id" format:"uuid"`
	Role         tournamentuser.TournamentUserRole `json:"role" enum:"referee,admin"`
	CreatedAt    time.Time                         `json:"created_at"`
	UpdatedAt    time.Time                         `json:"updated_at"`
}

func newTournamentUserResponse(membership tournamentuser.TournamentUser) TournamentUserResponse {
	return TournamentUserResponse{
		UserID:       membership.UserID.String(),
		TournamentID: membership.TournamentID.String(),
		Role:         membership.Role,
		CreatedAt:    membership.CreatedAt,
		UpdatedAt:    membership.UpdatedAt,
	}
}

type TournamentUserAddBody struct {
	UserID string                            `json:"user_id" format:"uuid" doc:"User to add to the tournament"`
	Role   tournamentuser.TournamentUserRole `json:"role" enum:"referee,admin" doc:"Role the user holds in this tournament"`
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
	Role tournamentuser.TournamentUserRole `json:"role" enum:"referee,admin" doc:"New role for this member"`
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
