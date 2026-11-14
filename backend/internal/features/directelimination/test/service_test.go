package test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"testing"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"
	"boutline/internal/session"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func directEliminationAPIError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

// ctxAs returns a context for the caller, or an anonymous one for uuid.Nil.
func ctxAs(t *testing.T, caller uuid.UUID) context.Context {
	t.Helper()

	if caller == uuid.Nil {
		return t.Context()
	}

	return session.WithUserID(t.Context(), caller)
}

func idInput(id string) *directelimination.DirectEliminationIDInput {
	return &directelimination.DirectEliminationIDInput{ID: id}
}

func TestCreateDirectElimination(t *testing.T) {
	t.Parallel()

	t.Run("creates an upcoming round with no timestamps", func(t *testing.T) {
		t.Parallel()

		eventID := TestEventID.String()
		repo := NewFakeDirectEliminationRepository()

		out, err := NewTestService(repo).
			CreateDirectElimination(ctxAs(t, TestAdminID), &directelimination.DirectEliminationCreateInput{
				Body: directelimination.DirectEliminationCreateBody{EventID: eventID},
			})

		require.NoError(t, err)
		assert.Equal(t, eventID, out.Body.EventID)
		assert.Equal(t, directelimination.DirectEliminationStatusUpcoming, out.Body.Status)
		assert.Nil(t, out.Body.StartedAt)
		assert.Nil(t, out.Body.CompletedAt)
		assert.Len(t, repo.DirectEliminations, 1)
	})

	t.Run("rejects an event_id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeDirectEliminationRepository()

		out, err := NewTestService(repo).
			CreateDirectElimination(ctxAs(t, TestAdminID), &directelimination.DirectEliminationCreateInput{
				Body: directelimination.DirectEliminationCreateBody{EventID: "not-a-uuid"},
			})

		code, detail := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "event_id must be a valid uuid", detail)
		assert.Nil(t, out)
		assert.Empty(t, repo.DirectEliminations)
	})

	t.Run("rejects an unknown event", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeDirectEliminationRepository()
		repo.Err = fmt.Errorf("create direct elimination: %w",
			errs.Public("event_id must reference an existing event", errs.ErrInvalidInput))

		_, err := NewTestService(repo).
			CreateDirectElimination(ctxAs(t, TestAdminID), &directelimination.DirectEliminationCreateInput{
				Body: directelimination.DirectEliminationCreateBody{EventID: TestEventID.String()},
			})

		code, detail := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "event_id must reference an existing event", detail)
	})

	t.Run("reports an event that does not exist as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeDirectEliminationRepository()

		_, err := NewTestService(repo).
			CreateDirectElimination(ctxAs(t, TestAdminID), &directelimination.DirectEliminationCreateInput{
				Body: directelimination.DirectEliminationCreateBody{EventID: uuid.New().String()},
			})

		code, _ := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
		assert.Empty(t, repo.DirectEliminations)
	})
}

func TestCreateDirectEliminationRequiresAdmin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		caller uuid.UUID
	}{
		{name: "refuses an anonymous caller"},
		{name: "refuses a caller who is not in the tournament", caller: TestOutsiderID},
		{name: "refuses a referee", caller: TestRefereeID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeDirectEliminationRepository()

			out, err := NewTestService(repo).
				CreateDirectElimination(ctxAs(t, tt.caller), &directelimination.DirectEliminationCreateInput{
					Body: directelimination.DirectEliminationCreateBody{EventID: TestEventID.String()},
				})

			code, _ := directEliminationAPIError(t, err)
			assert.Equal(t, http.StatusForbidden, code)
			assert.Nil(t, out)
			assert.Empty(t, repo.DirectEliminations)
		})
	}
}

func TestGetDirectEliminationByID(t *testing.T) {
	t.Parallel()

	stored := seededDirectElimination(uuid.New(), directelimination.DirectEliminationStatusUpcoming)
	service := NewTestService(NewFakeDirectEliminationRepository(stored))

	t.Run("returns the stored round", func(t *testing.T) {
		t.Parallel()

		out, err := service.GetDirectEliminationByID(t.Context(), idInput(stored.ID.String()))

		require.NoError(t, err)
		assert.Equal(t, stored.ID.String(), out.Body.ID)
		assert.Equal(t, stored.EventID.String(), out.Body.EventID)
		assert.Equal(t, stored.Status, out.Body.Status)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := service.GetDirectEliminationByID(t.Context(), idInput(uuid.New().String()))

		code, detail := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
		assert.Equal(t, "not found", detail)
	})

	t.Run("rejects an id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		_, err := service.GetDirectEliminationByID(t.Context(), idInput("not-a-uuid"))

		code, _ := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
}

func TestListDirectElimination(t *testing.T) {
	t.Parallel()

	eventA := uuid.New()
	eventB := uuid.New()
	seed := []directelimination.DirectElimination{
		seededDirectElimination(eventA, directelimination.DirectEliminationStatusUpcoming),
		seededDirectElimination(eventA, directelimination.DirectEliminationStatusActive),
		seededDirectElimination(eventB, directelimination.DirectEliminationStatusActive),
	}
	eventAString := eventA.String()
	active := directelimination.DirectEliminationStatusActive
	ended := directelimination.DirectEliminationStatusEnded

	tests := []struct {
		name       string
		input      *directelimination.DirectEliminationListInput
		wantTotal  int64
		wantRows   int
		wantLimit  int
		wantOffset int
		wantCode   int
		wantDetail string
	}{
		{
			name:      "returns every round without filters",
			input:     &directelimination.DirectEliminationListInput{},
			wantTotal: 3,
		},
		{
			name:      "filters by event_id",
			input:     &directelimination.DirectEliminationListInput{EventID: eventAString},
			wantTotal: 2,
		},
		{
			name:      "filters by status",
			input:     &directelimination.DirectEliminationListInput{Status: active},
			wantTotal: 2,
		},
		{
			name:      "combines event_id and status",
			input:     &directelimination.DirectEliminationListInput{EventID: eventAString, Status: active},
			wantTotal: 1,
		},
		{
			name:      "returns an empty list when nothing matches",
			input:     &directelimination.DirectEliminationListInput{Status: ended},
			wantTotal: 0,
		},
		{
			name:       "pages through rounds while total counts every match",
			input:      &directelimination.DirectEliminationListInput{Limit: 1, Offset: 1},
			wantTotal:  3,
			wantRows:   1,
			wantLimit:  1,
			wantOffset: 1,
		},
		{
			name:      "clamps an oversized limit and a negative offset",
			input:     &directelimination.DirectEliminationListInput{Limit: 1000, Offset: -5},
			wantTotal: 3,
			wantRows:  3,
			wantLimit: directelimination.DirectEliminationMaxPageSize,
		},
		{
			name:       "rejects an event_id that is not a uuid",
			input:      &directelimination.DirectEliminationListInput{EventID: "not-a-uuid"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "event_id must be a valid uuid",
		},
		{
			name:       "rejects an unknown status",
			input:      &directelimination.DirectEliminationListInput{Status: directelimination.DirectEliminationStatus("nope")},
			wantCode:   http.StatusBadRequest,
			wantDetail: `unknown status "nope"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := NewTestService(NewFakeDirectEliminationRepository(seed...)).
				ListDirectElimination(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := directEliminationAPIError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			if tt.wantLimit == 0 {
				assert.Len(t, out.Body.Data, int(tt.wantTotal))

				return
			}
			assert.Len(t, out.Body.Data, tt.wantRows)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
			assert.Equal(t, tt.wantOffset, out.Body.Offset)
		})
	}
}

func TestUpdateDirectEliminationByID(t *testing.T) {
	t.Parallel()

	newEvent := TestSecondEventID
	newEventString := newEvent.String()
	foreignEventString := OtherEventID.String()
	missingEventString := uuid.New().String()
	badEvent := "not-a-uuid"

	tests := []struct {
		name         string
		caller       uuid.UUID
		seedStatus   directelimination.DirectEliminationStatus
		body         directelimination.DirectEliminationUpdateBody
		useUnknownID bool
		wantCode     int
		wantDetail   string
	}{
		{
			name:       "moves an upcoming round to another event",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
		},
		{
			name:       "still allows an edit while active",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusActive,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
		},
		{
			name:       "refuses a patch that would change nothing",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide at least one field to update",
		},
		{
			name:       "rejects an event_id that is not a uuid",
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &badEvent},
			wantCode:   http.StatusBadRequest,
			wantDetail: "event_id must be a valid uuid",
		},
		{
			name:       "refuses to edit a round that has ended",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusEnded,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
			wantCode:   http.StatusConflict,
			wantDetail: "direct elimination round has ended and can no longer be edited",
		},
		{
			name:         "reports an unknown id as not found",
			caller:       TestAdminID,
			seedStatus:   directelimination.DirectEliminationStatusUpcoming,
			body:         directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
		{
			name:       "reports the target event not existing as not found",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &missingEventString},
			wantCode:   http.StatusNotFound,
		},
		{
			name:       "refuses to move a round into a tournament the caller does not administer",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &foreignEventString},
			wantCode:   http.StatusForbidden,
		},
		{
			name:       "refuses an anonymous caller",
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
			wantCode:   http.StatusForbidden,
		},
		{
			name:       "refuses a caller who is not in the tournament",
			caller:     TestOutsiderID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
			wantCode:   http.StatusForbidden,
		},
		{
			name:       "refuses a referee",
			caller:     TestRefereeID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
			wantCode:   http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededDirectElimination(TestEventID, tt.seedStatus)
			repo := NewFakeDirectEliminationRepository(stored)

			id := stored.ID.String()
			if tt.useUnknownID {
				id = uuid.New().String()
			}

			out, err := NewTestService(repo).
				UpdateDirectEliminationByID(ctxAs(t, tt.caller), &directelimination.DirectEliminationUpdateInput{
					ID:   id,
					Body: tt.body,
				})

			if tt.wantCode != 0 {
				code, detail := directEliminationAPIError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, stored.EventID, repo.DirectEliminations[stored.ID].EventID)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, newEventString, out.Body.EventID)
			assert.Equal(t, newEvent, repo.DirectEliminations[stored.ID].EventID)
			assert.Equal(t, tt.seedStatus, repo.DirectEliminations[stored.ID].Status)
		})
	}
}

func TestDeleteDirectEliminationByID(t *testing.T) {
	t.Parallel()

	t.Run("removes the round", func(t *testing.T) {
		t.Parallel()

		stored := seededDirectElimination(TestEventID, directelimination.DirectEliminationStatusUpcoming)
		repo := NewFakeDirectEliminationRepository(stored)
		service := NewTestService(repo)

		_, err := service.DeleteDirectEliminationByID(ctxAs(t, TestAdminID), idInput(stored.ID.String()))

		require.NoError(t, err)
		assert.Empty(t, repo.DirectEliminations)

		_, err = service.DeleteDirectEliminationByID(ctxAs(t, TestAdminID), idInput(stored.ID.String()))
		code, _ := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := NewTestService(NewFakeDirectEliminationRepository()).
			DeleteDirectEliminationByID(ctxAs(t, TestAdminID), idInput(uuid.New().String()))

		code, _ := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})

	t.Run("rejects an id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		_, err := NewTestService(NewFakeDirectEliminationRepository()).
			DeleteDirectEliminationByID(ctxAs(t, TestAdminID), idInput("not-a-uuid"))

		code, _ := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
}

func TestDeleteDirectEliminationRequiresAdmin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		caller uuid.UUID
	}{
		{name: "refuses an anonymous caller"},
		{name: "refuses a caller who is not in the tournament", caller: TestOutsiderID},
		{name: "refuses a referee", caller: TestRefereeID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededDirectElimination(TestEventID, directelimination.DirectEliminationStatusUpcoming)
			repo := NewFakeDirectEliminationRepository(stored)

			_, err := NewTestService(repo).
				DeleteDirectEliminationByID(ctxAs(t, tt.caller), idInput(stored.ID.String()))

			code, _ := directEliminationAPIError(t, err)
			assert.Equal(t, http.StatusForbidden, code)
			assert.Equal(t, stored, repo.DirectEliminations[stored.ID])
		})
	}
}

func TestStartDirectElimination(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		caller       uuid.UUID
		seedStatus   directelimination.DirectEliminationStatus
		useUnknownID bool
		wantCode     int
		wantDetail   string
	}{
		{name: "moves an upcoming round to active", caller: TestAdminID, seedStatus: directelimination.DirectEliminationStatusUpcoming},
		{
			name:       "refuses a round that has already started",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusActive,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming direct elimination round can be started",
		},
		{
			name:       "refuses a round that has ended",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusEnded,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming direct elimination round can be started",
		},
		{
			name:         "reports an unknown id as not found",
			caller:       TestAdminID,
			seedStatus:   directelimination.DirectEliminationStatusUpcoming,
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
		{
			name:       "refuses an anonymous caller",
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			wantCode:   http.StatusForbidden,
		},
		{
			name:       "refuses a caller who is not in the tournament",
			caller:     TestOutsiderID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			wantCode:   http.StatusForbidden,
		},
		{
			name:       "refuses a referee",
			caller:     TestRefereeID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			wantCode:   http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededDirectElimination(TestEventID, tt.seedStatus)
			repo := NewFakeDirectEliminationRepository(stored)

			id := stored.ID.String()
			if tt.useUnknownID {
				id = uuid.New().String()
			}

			out, err := NewTestService(repo).
				StartDirectElimination(ctxAs(t, tt.caller), idInput(id))

			if tt.wantCode != 0 {
				code, detail := directEliminationAPIError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, tt.seedStatus, repo.DirectEliminations[stored.ID].Status)
				assert.Nil(t, repo.DirectEliminations[stored.ID].StartedAt)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, directelimination.DirectEliminationStatusActive, out.Body.Status)
			assert.Equal(t, directelimination.DirectEliminationStatusActive, repo.DirectEliminations[stored.ID].Status)
			require.NotNil(t, out.Body.StartedAt)
			assert.WithinDuration(t, time.Now(), *out.Body.StartedAt, 5*time.Second)
			assert.NotNil(t, repo.DirectEliminations[stored.ID].StartedAt)
			assert.Nil(t, out.Body.CompletedAt)
		})
	}
}

func TestCompleteDirectElimination(t *testing.T) {
	t.Parallel()

	startedAt := time.Now().UTC().Add(-time.Hour)

	tests := []struct {
		name         string
		caller       uuid.UUID
		seedStatus   directelimination.DirectEliminationStatus
		useUnknownID bool
		wantCode     int
		wantDetail   string
	}{
		{name: "moves an active round to ended", caller: TestAdminID, seedStatus: directelimination.DirectEliminationStatusActive},
		{
			name:       "refuses a round that has not started",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusUpcoming,
			wantCode:   http.StatusConflict,
			wantDetail: "only an active direct elimination round can be completed",
		},
		{
			name:       "refuses a round that has already ended",
			caller:     TestAdminID,
			seedStatus: directelimination.DirectEliminationStatusEnded,
			wantCode:   http.StatusConflict,
			wantDetail: "only an active direct elimination round can be completed",
		},
		{
			name:         "reports an unknown id as not found",
			caller:       TestAdminID,
			seedStatus:   directelimination.DirectEliminationStatusActive,
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
		{
			name:       "refuses an anonymous caller",
			seedStatus: directelimination.DirectEliminationStatusActive,
			wantCode:   http.StatusForbidden,
		},
		{
			name:       "refuses a caller who is not in the tournament",
			caller:     TestOutsiderID,
			seedStatus: directelimination.DirectEliminationStatusActive,
			wantCode:   http.StatusForbidden,
		},
		{
			name:       "refuses a referee",
			caller:     TestRefereeID,
			seedStatus: directelimination.DirectEliminationStatusActive,
			wantCode:   http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededDirectElimination(TestEventID, tt.seedStatus)
			if tt.seedStatus != directelimination.DirectEliminationStatusUpcoming {
				stored.StartedAt = &startedAt
			}
			repo := NewFakeDirectEliminationRepository(stored)

			id := stored.ID.String()
			if tt.useUnknownID {
				id = uuid.New().String()
			}

			out, err := NewTestService(repo).
				CompleteDirectElimination(ctxAs(t, tt.caller), idInput(id))

			if tt.wantCode != 0 {
				code, detail := directEliminationAPIError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, tt.seedStatus, repo.DirectEliminations[stored.ID].Status)
				assert.Nil(t, repo.DirectEliminations[stored.ID].CompletedAt)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, directelimination.DirectEliminationStatusEnded, out.Body.Status)
			require.NotNil(t, out.Body.CompletedAt)
			assert.WithinDuration(t, time.Now(), *out.Body.CompletedAt, 5*time.Second)
			assert.NotNil(t, repo.DirectEliminations[stored.ID].CompletedAt)

			// Completing must not rewrite when the round started.
			require.NotNil(t, out.Body.StartedAt)
			assert.Equal(t, startedAt, *out.Body.StartedAt)
		})
	}
}

func TestDirectEliminationRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeDirectEliminationRepository()
	repo.Err = errors.New("connection refused")

	_, err := NewTestService(repo).
		ListDirectElimination(t.Context(), &directelimination.DirectEliminationListInput{})

	code, detail := directEliminationAPIError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
