package tournamentuser

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
)

// MembershipLookup is the subset of TournamentUserRepository a referee check needs.
type MembershipLookup interface {
	GetTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) (*TournamentUser, error)
}

// ValidateReferee accepts any staff role, so an admin can referee their own
// tournament. A nil refereeID means no referee is being assigned.
func ValidateReferee(ctx context.Context, memberships MembershipLookup, tournamentID uuid.UUID, refereeID *uuid.UUID) error {
	if refereeID == nil {
		return nil
	}

	if _, err := memberships.GetTournamentUser(ctx, tournamentID, *refereeID); err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			return errs.Public("referee_id must reference a staff member of the tournament", errs.ErrInvalidInput)
		}
		return fmt.Errorf("get tournament user: %w", err)
	}

	return nil
}
