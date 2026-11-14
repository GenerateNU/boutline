package bout

import (
	"context"

	"boutline/internal/errs"
	"boutline/internal/features/tournamentuser"
	"boutline/internal/session"
)

func requireBoutAdmin(ctx context.Context, memberships tournamentuser.MembershipLookup, bout *Bout) error {
	return tournamentuser.RequireRole(ctx, memberships, bout.TournamentID, tournamentuser.TournamentUserRoleAdmin)
}

// RequireAssignedReferee refuses the caller unless they hold the referee role in
// the bout's tournament and are the bout's assigned referee. The admin role alone
// is not enough: an admin referees only the bouts they are assigned to.
func RequireAssignedReferee(ctx context.Context, memberships tournamentuser.MembershipLookup, bout *Bout) error {
	err := tournamentuser.RequireRole(ctx, memberships, bout.TournamentID, tournamentuser.TournamentUserRoleReferee)
	if err != nil {
		return err
	}

	if bout.RefereeID == nil {
		return errs.Public("a referee must be assigned to the bout first", errs.ErrConflict)
	}
	if caller, ok := session.UserIDFrom(ctx); !ok || caller != *bout.RefereeID {
		return errs.Public("only the bout's assigned referee can start, score or end it", errs.ErrForbidden)
	}

	return nil
}
