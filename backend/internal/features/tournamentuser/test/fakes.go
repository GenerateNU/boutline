package test

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/tournamentuser"

	"github.com/google/uuid"
)

var _ tournamentuser.MembershipLookup = (*FakeMembershipLookup)(nil)

type FakeMembershipLookup struct {
	Memberships []tournamentuser.TournamentUser
	Err         error
}

func NewFakeMembershipLookup(seed ...tournamentuser.TournamentUser) *FakeMembershipLookup {
	return &FakeMembershipLookup{Memberships: seed}
}

func (f *FakeMembershipLookup) GetTournamentUser(
	_ context.Context,
	tournamentID, userID uuid.UUID,
) (*tournamentuser.TournamentUser, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	for _, member := range f.Memberships {
		if member.TournamentID == tournamentID && member.UserID == userID {
			return &member, nil
		}
	}

	return nil, fmt.Errorf("select tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
}

// Staff is one tournament's referee and admin, plus an outsider who referees a
// different tournament.
type Staff struct {
	TournamentID uuid.UUID
	Referee      uuid.UUID
	Admin        uuid.UUID
	Outsider     uuid.UUID
}

func NewStaff() Staff {
	return Staff{TournamentID: uuid.New(), Referee: uuid.New(), Admin: uuid.New(), Outsider: uuid.New()}
}

func (s Staff) Lookup() *FakeMembershipLookup {
	return NewFakeMembershipLookup(
		tournamentuser.TournamentUser{
			UserID: s.Referee, TournamentID: s.TournamentID, Role: tournamentuser.TournamentUserRoleReferee,
		},
		tournamentuser.TournamentUser{
			UserID: s.Admin, TournamentID: s.TournamentID, Role: tournamentuser.TournamentUserRoleAdmin,
		},
		tournamentuser.TournamentUser{
			UserID: s.Outsider, TournamentID: uuid.New(), Role: tournamentuser.TournamentUserRoleReferee,
		},
	)
}
