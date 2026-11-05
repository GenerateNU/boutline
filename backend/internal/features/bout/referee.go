package bout

import (
	"context"

	"boutline/internal/errs"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

var errNotBoutReferee = errs.Public("only the bout's assigned referee can do this", errs.ErrForbidden)

// AuthorizeReferee returns the caller when they are the bout's assigned
// referee, so callers can record them as the actor. A request with no verified
// caller is refused rather than let through.
func AuthorizeReferee(ctx context.Context, b *Bout) (uuid.UUID, error) {
	caller, ok := user.UserIDFrom(ctx)
	if !ok || b.RefereeID == nil || *b.RefereeID != caller {
		return uuid.Nil, errNotBoutReferee
	}

	return caller, nil
}
