package test

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/tournamentuser"

	"github.com/google/uuid"
)

var _ tournamentuser.MembershipLookup = (*FakeMembershipLookup)(nil)

// FakeMembershipLookup is shared by every feature whose writes call
// tournamentuser.RequireRole, so their tests seed staff the same way.
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
