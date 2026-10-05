package test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/directelimination"

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

func idInput(id string) *directelimination.DirectEliminationIDInput {
	return &directelimination.DirectEliminationIDInput{ID: id}
}

func TestCreateDirectElimination(t *testing.T) {
	t.Parallel()

	t.Run("creates an upcoming round with no timestamps", func(t *testing.T) {
		t.Parallel()

		eventID := uuid.New().String()
		repo := NewFakeDirectEliminationRepository()

		out, err := directelimination.NewDirectEliminationService(repo).
			CreateDirectElimination(t.Context(), &directelimination.DirectEliminationCreateInput{
				Body: directelimination.DirectEliminationCreateBody{EventID: eventID},
			})

		require.NoError(t, err)
		assert.Equal(t, eventID, out.Body.EventID)
		assert.Equal(t, directelimination.StatusUpcoming, out.Body.Status)
		assert.Nil(t, out.Body.StartedAt)
		assert.Nil(t, out.Body.CompletedAt)
		assert.Len(t, repo.DirectEliminations, 1)
	})

	t.Run("rejects an event_id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeDirectEliminationRepository()

		out, err := directelimination.NewDirectEliminationService(repo).
			CreateDirectElimination(t.Context(), &directelimination.DirectEliminationCreateInput{
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

		_, err := directelimination.NewDirectEliminationService(repo).
			CreateDirectElimination(t.Context(), &directelimination.DirectEliminationCreateInput{
				Body: directelimination.DirectEliminationCreateBody{EventID: uuid.New().String()},
			})

		code, detail := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "event_id must reference an existing event", detail)
	})
}

func TestGetDirectEliminationByID(t *testing.T) {
	t.Parallel()

	stored := seededDirectElimination(uuid.New(), directelimination.StatusUpcoming)
	service := directelimination.NewDirectEliminationService(NewFakeDirectEliminationRepository(stored))

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
		seededDirectElimination(eventA, directelimination.StatusUpcoming),
		seededDirectElimination(eventA, directelimination.StatusActive),
		seededDirectElimination(eventB, directelimination.StatusActive),
	}
	eventAString := eventA.String()
	active := directelimination.StatusActive
	ended := directelimination.StatusEnd

	tests := []struct {
		name       string
		input      *directelimination.DirectEliminationListInput
		wantTotal  int64
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
			name:       "rejects an event_id that is not a uuid",
			input:      &directelimination.DirectEliminationListInput{EventID: "not-a-uuid"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "event_id must be a valid uuid",
		},
		{
			name:       "rejects an unknown status",
			input:      &directelimination.DirectEliminationListInput{Status: directelimination.Status("nope")},
			wantCode:   http.StatusBadRequest,
			wantDetail: `unknown status "nope"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := directelimination.NewDirectEliminationService(NewFakeDirectEliminationRepository(seed...)).
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
			assert.Len(t, out.Body.Data, int(tt.wantTotal))
		})
	}
}

func TestUpdateDirectEliminationByID(t *testing.T) {
	t.Parallel()

	newEvent := uuid.New()
	newEventString := newEvent.String()
	badEvent := "not-a-uuid"

	tests := []struct {
		name         string
		seedStatus   directelimination.Status
		body         directelimination.DirectEliminationUpdateBody
		useUnknownID bool
		wantCode     int
		wantDetail   string
	}{
		{
			name:       "moves an upcoming round to another event",
			seedStatus: directelimination.StatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
		},
		{
			name:       "still allows an edit while active",
			seedStatus: directelimination.StatusActive,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
		},
		{
			name:       "refuses a patch that would change nothing",
			seedStatus: directelimination.StatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide at least one field to update",
		},
		{
			name:       "rejects an event_id that is not a uuid",
			seedStatus: directelimination.StatusUpcoming,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &badEvent},
			wantCode:   http.StatusBadRequest,
			wantDetail: "event_id must be a valid uuid",
		},
		{
			name:       "refuses to edit a round that has ended",
			seedStatus: directelimination.StatusEnd,
			body:       directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
			wantCode:   http.StatusConflict,
			wantDetail: "direct elimination round has ended and can no longer be edited",
		},
		{
			name:         "reports an unknown id as not found",
			seedStatus:   directelimination.StatusUpcoming,
			body:         directelimination.DirectEliminationUpdateBody{EventID: &newEventString},
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededDirectElimination(uuid.New(), tt.seedStatus)
			repo := NewFakeDirectEliminationRepository(stored)

			id := stored.ID.String()
			if tt.useUnknownID {
				id = uuid.New().String()
			}

			out, err := directelimination.NewDirectEliminationService(repo).
				UpdateDirectEliminationByID(t.Context(), &directelimination.DirectEliminationUpdateInput{
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

		stored := seededDirectElimination(uuid.New(), directelimination.StatusUpcoming)
		repo := NewFakeDirectEliminationRepository(stored)
		service := directelimination.NewDirectEliminationService(repo)

		_, err := service.DeleteDirectEliminationByID(t.Context(), idInput(stored.ID.String()))

		require.NoError(t, err)
		assert.Empty(t, repo.DirectEliminations)

		_, err = service.DeleteDirectEliminationByID(t.Context(), idInput(stored.ID.String()))
		code, _ := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := directelimination.NewDirectEliminationService(NewFakeDirectEliminationRepository()).
			DeleteDirectEliminationByID(t.Context(), idInput(uuid.New().String()))

		code, _ := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})

	t.Run("rejects an id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		_, err := directelimination.NewDirectEliminationService(NewFakeDirectEliminationRepository()).
			DeleteDirectEliminationByID(t.Context(), idInput("not-a-uuid"))

		code, _ := directEliminationAPIError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
}

func TestStartDirectElimination(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		seedStatus   directelimination.Status
		useUnknownID bool
		wantCode     int
		wantDetail   string
	}{
		{name: "moves an upcoming round to active", seedStatus: directelimination.StatusUpcoming},
		{
			name:       "refuses a round that has already started",
			seedStatus: directelimination.StatusActive,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming direct elimination round can be started",
		},
		{
			name:       "refuses a round that has ended",
			seedStatus: directelimination.StatusEnd,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming direct elimination round can be started",
		},
		{
			name:         "reports an unknown id as not found",
			seedStatus:   directelimination.StatusUpcoming,
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededDirectElimination(uuid.New(), tt.seedStatus)
			repo := NewFakeDirectEliminationRepository(stored)

			id := stored.ID.String()
			if tt.useUnknownID {
				id = uuid.New().String()
			}

			out, err := directelimination.NewDirectEliminationService(repo).
				StartDirectElimination(t.Context(), idInput(id))

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
			assert.Equal(t, directelimination.StatusActive, out.Body.Status)
			assert.Equal(t, directelimination.StatusActive, repo.DirectEliminations[stored.ID].Status)
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
		seedStatus   directelimination.Status
		useUnknownID bool
		wantCode     int
		wantDetail   string
	}{
		{name: "moves an active round to end", seedStatus: directelimination.StatusActive},
		{
			name:       "refuses a round that has not started",
			seedStatus: directelimination.StatusUpcoming,
			wantCode:   http.StatusConflict,
			wantDetail: "only an active direct elimination round can be completed",
		},
		{
			name:       "refuses a round that has already ended",
			seedStatus: directelimination.StatusEnd,
			wantCode:   http.StatusConflict,
			wantDetail: "only an active direct elimination round can be completed",
		},
		{
			name:         "reports an unknown id as not found",
			seedStatus:   directelimination.StatusActive,
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededDirectElimination(uuid.New(), tt.seedStatus)
			if tt.seedStatus != directelimination.StatusUpcoming {
				stored.StartedAt = &startedAt
			}
			repo := NewFakeDirectEliminationRepository(stored)

			id := stored.ID.String()
			if tt.useUnknownID {
				id = uuid.New().String()
			}

			out, err := directelimination.NewDirectEliminationService(repo).
				CompleteDirectElimination(t.Context(), idInput(id))

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
			assert.Equal(t, directelimination.StatusEnd, out.Body.Status)
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

	_, err := directelimination.NewDirectEliminationService(repo).
		ListDirectElimination(t.Context(), &directelimination.DirectEliminationListInput{})

	code, detail := directEliminationAPIError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
