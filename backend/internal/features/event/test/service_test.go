package test

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/event"
	"boutline/internal/features/tournament"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seededTournament() tournament.Tournament {
	return tournament.Tournament{
		ID:         uuid.New(),
		Name:       "bracket",
		Visibility: tournament.TournamentVisibilityPrivate,
		Code:       "ABCDEF",
		Status:     tournament.TournamentStatusPending,
		CreatedBy:  uuid.New(),
	}
}

func seededEvent(status event.EventStatus, tournamentID uuid.UUID) event.Event {
	return event.Event{
		ID:           uuid.New(),
		TournamentID: tournamentID,
		Format:       event.EventFormatPoolThenDirectElimination,
		Name:         "lightweight",
		Status:       status,
	}
}

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func ptr[T any](v T) *T { return &v }

func TestCreateEvent(t *testing.T) {
	t.Parallel()

	tourney := seededTournament()

	tests := []struct {
		name        string
		lookup      *FakeTournamentLookup
		input       *event.EventCreateInput
		wantCode    int
		wantDetail  string
		wantName    string
		wantNoEvent bool
	}{
		{
			name:   "creates an upcoming event",
			lookup: NewFakeTournamentLookup(tourney),
			input: &event.EventCreateInput{Body: event.EventCreateBody{
				TournamentID: tourney.ID.String(),
				Name:         "lightweight",
			}},
			wantName: "lightweight",
		},
		{
			name:   "stores a name trimmed of surrounding whitespace",
			lookup: NewFakeTournamentLookup(tourney),
			input: &event.EventCreateInput{Body: event.EventCreateBody{
				TournamentID: tourney.ID.String(),
				Name:         "  lightweight  ",
			}},
			wantName: "lightweight",
		},
		{
			name:        "rejects a tournament_id that does not exist",
			lookup:      NewFakeTournamentLookup(),
			input:       &event.EventCreateInput{Body: event.EventCreateBody{TournamentID: uuid.New().String(), Name: "lightweight"}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "tournament_id must reference an existing tournament",
			wantNoEvent: true,
		},
		{
			name:        "rejects a blank name",
			lookup:      NewFakeTournamentLookup(tourney),
			input:       &event.EventCreateInput{Body: event.EventCreateBody{TournamentID: tourney.ID.String(), Name: ""}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "name must not be blank",
			wantNoEvent: true,
		},
		{
			name:        "rejects a whitespace-only name",
			lookup:      NewFakeTournamentLookup(tourney),
			input:       &event.EventCreateInput{Body: event.EventCreateBody{TournamentID: tourney.ID.String(), Name: "   "}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "name must not be blank",
			wantNoEvent: true,
		},
		{
			name:        "rejects a bad uuid",
			lookup:      NewFakeTournamentLookup(tourney),
			input:       &event.EventCreateInput{Body: event.EventCreateBody{TournamentID: "not-a-uuid", Name: "lightweight"}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "tournament_id must be a valid uuid",
			wantNoEvent: true,
		},
		{
			name:        "reports a tournament lookup failure as a server error",
			lookup:      &FakeTournamentLookup{Err: errors.New("connection refused")},
			input:       &event.EventCreateInput{Body: event.EventCreateBody{TournamentID: tourney.ID.String(), Name: "lightweight"}},
			wantCode:    http.StatusInternalServerError,
			wantDetail:  "internal server error",
			wantNoEvent: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeEventRepository()
			out, err := event.NewEventService(repo, tt.lookup).CreateEvent(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				if tt.wantNoEvent {
					assert.Empty(t, repo.Events)
				}

				return
			}

			require.NoError(t, err)
			assert.Equal(t, event.EventStatusUpcoming, out.Body.Status)
			assert.Equal(t, event.EventFormatPoolThenDirectElimination, out.Body.Format)
			assert.Equal(t, tt.wantName, out.Body.Name)
			assert.Len(t, repo.Events, 1)
		})
	}
}

func TestListEvents(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	otherTournamentID := uuid.New()

	mixed := []event.Event{
		seededEvent(event.EventStatusUpcoming, tournamentID),
		seededEvent(event.EventStatusActive, tournamentID),
		seededEvent(event.EventStatusUpcoming, otherTournamentID),
	}

	tests := []struct {
		name      string
		seed      []event.Event
		input     *event.EventListInput
		wantTotal int64
		wantLimit int
		wantCode  int
	}{
		{
			name:      "filters by tournament_id",
			seed:      mixed,
			input:     &event.EventListInput{TournamentID: tournamentID.String()},
			wantTotal: 2,
			wantLimit: event.EventDefaultPageSize,
		},
		{
			name:      "filters by status",
			seed:      mixed,
			input:     &event.EventListInput{Status: event.EventStatusActive},
			wantTotal: 1,
			wantLimit: event.EventDefaultPageSize,
		},
		{
			name:      "clamps a limit above the maximum",
			seed:      mixed,
			input:     &event.EventListInput{Limit: 500},
			wantTotal: 3,
			wantLimit: event.EventMaxPageSize,
		},
		{
			name:     "rejects an unknown status",
			seed:     mixed,
			input:    &event.EventListInput{Status: event.EventStatus("nope")},
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a bad tournament_id",
			seed:     mixed,
			input:    &event.EventListInput{TournamentID: "not-a-uuid"},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := event.NewEventService(NewFakeEventRepository(tt.seed...), NewFakeTournamentLookup()).
				ListEvents(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
		})
	}
}

func TestUpdateEventByID(t *testing.T) {
	t.Parallel()

	t.Run("edits an upcoming event", func(t *testing.T) {
		t.Parallel()

		stored := seededEvent(event.EventStatusUpcoming, uuid.New())
		repo := NewFakeEventRepository(stored)

		out, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: stored.ID.String(), Body: event.EventUpdateBody{
				Name: ptr("heavyweight"),
			}})

		require.NoError(t, err)
		assert.Equal(t, "heavyweight", out.Body.Name)
		assert.Equal(t, "heavyweight", repo.Events[stored.ID].Name)
	})

	t.Run("stores a name trimmed of surrounding whitespace", func(t *testing.T) {
		t.Parallel()

		stored := seededEvent(event.EventStatusUpcoming, uuid.New())
		repo := NewFakeEventRepository(stored)

		out, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: stored.ID.String(), Body: event.EventUpdateBody{
				Name: ptr("  heavyweight  "),
			}})

		require.NoError(t, err)
		assert.Equal(t, "heavyweight", out.Body.Name)
		assert.Equal(t, "heavyweight", repo.Events[stored.ID].Name)
	})

	t.Run("refuses to edit an active event", func(t *testing.T) {
		t.Parallel()

		stored := seededEvent(event.EventStatusActive, uuid.New())
		repo := NewFakeEventRepository(stored)

		_, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: stored.ID.String(), Body: event.EventUpdateBody{Name: ptr("heavyweight")}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an upcoming event can be edited", detail)
	})

	t.Run("refuses to edit an ended event", func(t *testing.T) {
		t.Parallel()

		stored := seededEvent(event.EventStatusEnded, uuid.New())
		repo := NewFakeEventRepository(stored)

		_, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: stored.ID.String(), Body: event.EventUpdateBody{Name: ptr("heavyweight")}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an upcoming event can be edited", detail)
	})

	t.Run("refuses an empty patch", func(t *testing.T) {
		t.Parallel()

		stored := seededEvent(event.EventStatusUpcoming, uuid.New())
		repo := NewFakeEventRepository(stored)

		_, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: stored.ID.String(), Body: event.EventUpdateBody{}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "provide at least one field to update", detail)
	})

	t.Run("rejects a blank name", func(t *testing.T) {
		t.Parallel()

		stored := seededEvent(event.EventStatusUpcoming, uuid.New())
		repo := NewFakeEventRepository(stored)

		_, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: stored.ID.String(), Body: event.EventUpdateBody{Name: ptr("")}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "name must not be blank", detail)
	})

	t.Run("rejects a whitespace-only name", func(t *testing.T) {
		t.Parallel()

		stored := seededEvent(event.EventStatusUpcoming, uuid.New())
		repo := NewFakeEventRepository(stored)

		_, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: stored.ID.String(), Body: event.EventUpdateBody{Name: ptr("   ")}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "name must not be blank", detail)
	})

	t.Run("updates only the scheduled start time", func(t *testing.T) {
		t.Parallel()

		stored := seededEvent(event.EventStatusUpcoming, uuid.New())
		repo := NewFakeEventRepository(stored)
		newStart := time.Date(2026, 11, 1, 9, 0, 0, 0, time.UTC)

		out, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: stored.ID.String(), Body: event.EventUpdateBody{StartTime: &newStart}})

		require.NoError(t, err)
		require.NotNil(t, out.Body.StartTime)
		assert.Equal(t, newStart, *out.Body.StartTime)
		assert.Equal(t, stored.Name, out.Body.Name, "name is unchanged")
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeEventRepository()

		_, err := event.NewEventService(repo, NewFakeTournamentLookup()).UpdateEventByID(t.Context(),
			&event.EventUpdateInput{ID: uuid.New().String(), Body: event.EventUpdateBody{Name: ptr("heavyweight")}})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestDeleteEventByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		status     event.EventStatus
		unknownID  bool
		wantCode   int
		wantDetail string
	}{
		{name: "deletes an upcoming event", status: event.EventStatusUpcoming},
		{
			name:       "refuses to delete an active event",
			status:     event.EventStatusActive,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming event can be deleted",
		},
		{
			name:       "refuses to delete an ended event",
			status:     event.EventStatusEnded,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming event can be deleted",
		},
		{
			name:      "reports an unknown id as not found",
			status:    event.EventStatusUpcoming,
			unknownID: true,
			wantCode:  http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededEvent(tt.status, uuid.New())
			repo := NewFakeEventRepository(stored)
			id := stored.ID
			if tt.unknownID {
				id = uuid.New()
			}

			_, err := event.NewEventService(repo, NewFakeTournamentLookup()).
				DeleteEventByID(t.Context(), &event.EventIDInput{ID: id.String()})

			if tt.wantCode == 0 {
				require.NoError(t, err)
				assert.NotContains(t, repo.Events, stored.ID)
				return
			}

			code, detail := apiError(t, err)
			assert.Equal(t, tt.wantCode, code)
			if tt.wantDetail != "" {
				assert.Equal(t, tt.wantDetail, detail)
			}
			assert.Contains(t, repo.Events, stored.ID)
		})
	}
}

func TestEventRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeEventRepository()
	repo.Err = errors.New("connection refused")

	_, err := event.NewEventService(repo, NewFakeTournamentLookup()).
		ListEvents(t.Context(), &event.EventListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
