package test

import (
	"context"
	"net/http"
	"testing"

	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seededMembership(tournamentID, userID uuid.UUID, role tournamentuser.TournamentUserRole) tournamentuser.TournamentUser {
	return tournamentuser.TournamentUser{TournamentID: tournamentID, UserID: userID, Role: role}
}

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func TestAddTournamentUser(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	existing := uuid.New()

	tests := []struct {
		name         string
		tournamentID string
		userID       string
		role         tournamentuser.TournamentUserRole
		wantRole     tournamentuser.TournamentUserRole
		wantCode     int
		wantDetail   string
	}{
		{
			name:         "adds a referee",
			tournamentID: tournamentID.String(),
			userID:       uuid.New().String(),
			role:         tournamentuser.TournamentUserRoleReferee,
			wantRole:     tournamentuser.TournamentUserRoleReferee,
		},
		{
			name:         "adds an admin",
			tournamentID: tournamentID.String(),
			userID:       uuid.New().String(),
			role:         tournamentuser.TournamentUserRoleAdmin,
			wantRole:     tournamentuser.TournamentUserRoleAdmin,
		},
		{
			name:         "rejects an unknown role",
			tournamentID: tournamentID.String(),
			userID:       uuid.New().String(),
			role:         tournamentuser.TournamentUserRole("scorekeeper"),
			wantCode:     http.StatusBadRequest,
			wantDetail:   `unknown role "scorekeeper"`,
		},
		{
			name:         "rejects a tournament id that is not a uuid",
			tournamentID: "not-a-uuid",
			userID:       uuid.New().String(),
			role:         tournamentuser.TournamentUserRoleReferee,
			wantCode:     http.StatusBadRequest,
			wantDetail:   "id must be a valid uuid",
		},
		{
			name:         "rejects a user id that is not a uuid",
			tournamentID: tournamentID.String(),
			userID:       "not-a-uuid",
			role:         tournamentuser.TournamentUserRoleReferee,
			wantCode:     http.StatusBadRequest,
			wantDetail:   "user_id must be a valid uuid",
		},
		{
			name:         "reports an already-added user as a duplicate",
			tournamentID: tournamentID.String(),
			userID:       existing.String(),
			role:         tournamentuser.TournamentUserRoleAdmin,
			wantCode:     http.StatusConflict,
			wantDetail:   "already exists",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			service := tournamentuser.NewTournamentUserService(NewFakeTournamentUserRepository(
				seededMembership(tournamentID, existing, tournamentuser.TournamentUserRoleReferee)))

			output, err := service.AddTournamentUser(context.Background(), &tournamentuser.TournamentUserAddInput{
				TournamentID: tt.tournamentID,
				Body:         tournamentuser.TournamentUserAddBody{UserID: tt.userID, Role: tt.role},
			})

			if tt.wantCode != 0 {
				status, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, status)
				assert.Equal(t, tt.wantDetail, detail)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantRole, output.Body.Role)
			assert.Equal(t, tt.userID, output.Body.UserID)
			assert.Equal(t, tt.tournamentID, output.Body.TournamentID)
		})
	}
}

func TestListTournamentUsers(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	other := uuid.New()
	seed := []tournamentuser.TournamentUser{
		seededMembership(tournamentID, uuid.New(), tournamentuser.TournamentUserRoleReferee),
		seededMembership(tournamentID, uuid.New(), tournamentuser.TournamentUserRoleAdmin),
		seededMembership(other, uuid.New(), tournamentuser.TournamentUserRoleReferee),
	}

	t.Run("returns a page and the unpaged total for that tournament only", func(t *testing.T) {
		t.Parallel()

		service := tournamentuser.NewTournamentUserService(NewFakeTournamentUserRepository(seed...))

		output, err := service.ListTournamentUsers(context.Background(), &tournamentuser.TournamentUserListInput{
			TournamentID: tournamentID.String(),
			Limit:        1,
		})

		require.NoError(t, err)
		assert.Len(t, output.Body.Data, 1)
		assert.Equal(t, int64(2), output.Body.Total)
		assert.Equal(t, 1, output.Body.Limit)
	})

	t.Run("defaults and clamps the page size", func(t *testing.T) {
		t.Parallel()

		service := tournamentuser.NewTournamentUserService(NewFakeTournamentUserRepository(seed...))

		defaulted, err := service.ListTournamentUsers(context.Background(), &tournamentuser.TournamentUserListInput{
			TournamentID: tournamentID.String(),
		})
		require.NoError(t, err)
		assert.Equal(t, tournamentuser.TournamentUserDefaultPageSize, defaulted.Body.Limit)

		clamped, err := service.ListTournamentUsers(context.Background(), &tournamentuser.TournamentUserListInput{
			TournamentID: tournamentID.String(),
			Limit:        5000,
		})
		require.NoError(t, err)
		assert.Equal(t, tournamentuser.TournamentUserMaxPageSize, clamped.Body.Limit)
	})

	t.Run("returns an empty page for a tournament with no members", func(t *testing.T) {
		t.Parallel()

		service := tournamentuser.NewTournamentUserService(NewFakeTournamentUserRepository(seed...))

		output, err := service.ListTournamentUsers(context.Background(), &tournamentuser.TournamentUserListInput{
			TournamentID: uuid.New().String(),
		})

		require.NoError(t, err)
		assert.Empty(t, output.Body.Data)
		assert.Equal(t, int64(0), output.Body.Total)
	})
}

func TestUpdateTournamentUserRole(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	userID := uuid.New()

	tests := []struct {
		name       string
		userID     string
		role       tournamentuser.TournamentUserRole
		wantRole   tournamentuser.TournamentUserRole
		wantCode   int
		wantDetail string
	}{
		{
			name:     "promotes a referee to admin",
			userID:   userID.String(),
			role:     tournamentuser.TournamentUserRoleAdmin,
			wantRole: tournamentuser.TournamentUserRoleAdmin,
		},
		{
			name:       "rejects an unknown role",
			userID:     userID.String(),
			role:       tournamentuser.TournamentUserRole("nope"),
			wantCode:   http.StatusBadRequest,
			wantDetail: `unknown role "nope"`,
		},
		{
			name:       "reports a user who is not a member as not found",
			userID:     uuid.New().String(),
			role:       tournamentuser.TournamentUserRoleAdmin,
			wantCode:   http.StatusNotFound,
			wantDetail: "not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			service := tournamentuser.NewTournamentUserService(NewFakeTournamentUserRepository(
				seededMembership(tournamentID, userID, tournamentuser.TournamentUserRoleReferee)))

			output, err := service.UpdateTournamentUserRole(
				context.Background(),
				&tournamentuser.TournamentUserUpdateRoleInput{
					TournamentID: tournamentID.String(),
					UserID:       tt.userID,
					Body:         tournamentuser.TournamentUserUpdateRoleBody{Role: tt.role},
				})

			if tt.wantCode != 0 {
				status, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, status)
				assert.Equal(t, tt.wantDetail, detail)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantRole, output.Body.Role)
		})
	}
}

func TestRemoveTournamentUser(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	userID := uuid.New()

	t.Run("removes the membership and is not repeatable", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeTournamentUserRepository(
			seededMembership(tournamentID, userID, tournamentuser.TournamentUserRoleReferee))
		service := tournamentuser.NewTournamentUserService(repo)
		input := &tournamentuser.TournamentUserRemoveInput{
			TournamentID: tournamentID.String(),
			UserID:       userID.String(),
		}

		_, err := service.RemoveTournamentUser(context.Background(), input)
		require.NoError(t, err)
		assert.Empty(t, repo.Memberships)

		_, err = service.RemoveTournamentUser(context.Background(), input)
		status, detail := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, status)
		assert.Equal(t, "not found", detail)
	})

	t.Run("rejects a user id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		service := tournamentuser.NewTournamentUserService(NewFakeTournamentUserRepository())

		_, err := service.RemoveTournamentUser(context.Background(), &tournamentuser.TournamentUserRemoveInput{
			TournamentID: tournamentID.String(),
			UserID:       "not-a-uuid",
		})

		status, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, status)
		assert.Equal(t, "user_id must be a valid uuid", detail)
	})
}

func TestListTournamentsByUser(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	joined := tournament.Tournament{ID: uuid.New(), Name: "a joined", Status: tournament.TournamentStatusPending}
	alsoJoined := tournament.Tournament{ID: uuid.New(), Name: "b joined", Status: tournament.TournamentStatusActive}
	unrelated := tournament.Tournament{ID: uuid.New(), Name: "c unrelated", Status: tournament.TournamentStatusPending}

	newService := func() tournamentuser.TournamentUserService {
		repo := NewFakeTournamentUserRepository(
			seededMembership(joined.ID, userID, tournamentuser.TournamentUserRoleReferee),
			seededMembership(alsoJoined.ID, userID, tournamentuser.TournamentUserRoleAdmin),
			seededMembership(unrelated.ID, uuid.New(), tournamentuser.TournamentUserRoleAdmin),
		)
		for _, listed := range []tournament.Tournament{joined, alsoJoined, unrelated} {
			repo.Tournaments[listed.ID] = listed
		}

		return tournamentuser.NewTournamentUserService(repo)
	}

	t.Run("returns only the tournaments the user belongs to", func(t *testing.T) {
		t.Parallel()

		output, err := newService().ListTournamentsByUser(
			context.Background(),
			&tournamentuser.TournamentUserTournamentsInput{UserID: userID.String()})

		require.NoError(t, err)
		require.Len(t, output.Body.Data, 2)
		assert.Equal(t, int64(2), output.Body.Total)
		assert.Equal(t, "a joined", output.Body.Data[0].Name)
		assert.Equal(t, "b joined", output.Body.Data[1].Name)
	})

	t.Run("pages the result", func(t *testing.T) {
		t.Parallel()

		output, err := newService().ListTournamentsByUser(
			context.Background(),
			&tournamentuser.TournamentUserTournamentsInput{UserID: userID.String(), Limit: 1, Offset: 1})

		require.NoError(t, err)
		require.Len(t, output.Body.Data, 1)
		assert.Equal(t, "b joined", output.Body.Data[0].Name)
		assert.Equal(t, int64(2), output.Body.Total)
	})

	t.Run("rejects a user id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		_, err := newService().ListTournamentsByUser(
			context.Background(),
			&tournamentuser.TournamentUserTournamentsInput{UserID: "not-a-uuid"})

		status, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, status)
		assert.Equal(t, "id must be a valid uuid", detail)
	})
}
