package test

import (
	"errors"
	"net/http"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/features/tournamentuser"
	"boutline/internal/session"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestRequireRole(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	otherTournamentID := uuid.New()
	admin := uuid.New()
	referee := uuid.New()
	outsider := uuid.New()
	lookup := NewFakeMembershipLookup(
		tournamentuser.TournamentUser{TournamentID: tournamentID, UserID: admin, Role: tournamentuser.TournamentUserRoleAdmin},
		tournamentuser.TournamentUser{TournamentID: tournamentID, UserID: referee, Role: tournamentuser.TournamentUserRoleReferee},
		tournamentuser.TournamentUser{TournamentID: otherTournamentID, UserID: outsider, Role: tournamentuser.TournamentUserRoleAdmin},
	)

	tests := []struct {
		name       string
		caller     *uuid.UUID
		role       tournamentuser.TournamentUserRole
		wantStatus int // 0 means allowed
	}{
		{name: "admin passes an admin check", caller: &admin, role: tournamentuser.TournamentUserRoleAdmin},
		{name: "admin passes a referee check", caller: &admin, role: tournamentuser.TournamentUserRoleReferee},
		{name: "referee passes a referee check", caller: &referee, role: tournamentuser.TournamentUserRoleReferee},
		{
			name: "referee fails an admin check", caller: &referee,
			role: tournamentuser.TournamentUserRoleAdmin, wantStatus: http.StatusForbidden,
		},
		{
			name: "an admin of another tournament is refused", caller: &outsider,
			role: tournamentuser.TournamentUserRoleReferee, wantStatus: http.StatusForbidden,
		},
		{
			name: "a request with no caller is refused",
			role: tournamentuser.TournamentUserRoleReferee, wantStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctx := t.Context()
			if tt.caller != nil {
				ctx = session.WithUserID(ctx, *tt.caller)
			}

			err := tournamentuser.RequireRole(ctx, lookup, tournamentID, tt.role)
			if tt.wantStatus == 0 {
				assert.NoError(t, err)
				return
			}
			assert.Equal(t, tt.wantStatus, errs.StatusFor(err))
			assert.Equal(t, "this requires the "+string(tt.role)+" role in the tournament", errs.ClientMessage(err))
		})
	}

	t.Run("a failed lookup is not mistaken for a refusal", func(t *testing.T) {
		t.Parallel()

		broken := &FakeMembershipLookup{Err: errors.New("connection reset")}
		ctx := session.WithUserID(t.Context(), admin)

		err := tournamentuser.RequireRole(ctx, broken, tournamentID, tournamentuser.TournamentUserRoleAdmin)
		assert.Equal(t, http.StatusInternalServerError, errs.StatusFor(err))
	})
}
