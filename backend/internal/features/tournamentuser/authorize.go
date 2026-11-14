package tournamentuser

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/session"

	"github.com/google/uuid"
)

// MembershipLookup is the subset of TournamentUserRepository a role check needs.
type MembershipLookup interface {
	GetTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) (*TournamentUser, error)
}

// RequireRole refuses the caller unless they hold role in the tournament. An
// admin passes a referee check too, since an admin may do anything a referee can.
func RequireRole(
	ctx context.Context,
	memberships MembershipLookup,
	tournamentID uuid.UUID,
	role TournamentUserRole,
) error {
	forbidden := errs.Public(fmt.Sprintf("this requires the %s role in the tournament", role), errs.ErrForbidden)

	caller, ok := session.UserIDFrom(ctx)
	if !ok {
		return forbidden
	}

	membership, err := memberships.GetTournamentUser(ctx, tournamentID, caller)
	if errors.Is(err, errs.ErrNotFound) {
		return forbidden
	}
	if err != nil {
		return fmt.Errorf("get tournament user: %w", err)
	}

	if membership.Role != role && membership.Role != TournamentUserRoleAdmin {
		return forbidden
	}

	return nil
}
