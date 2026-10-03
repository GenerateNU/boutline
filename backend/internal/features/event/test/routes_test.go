package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/event"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, tournaments *FakeTournamentLookup, seed ...event.Event) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	event.RegisterEventService(api, event.NewEventService(NewFakeEventRepository(seed...), tournaments))

	return api
}

func decodeBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func TestCreateEndpoint(t *testing.T) {
	t.Parallel()

	tourney := seededTournament()

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name: "creates an event and echoes the stored row",
			body: map[string]any{
				"tournament_id": tourney.ID.String(),
				"name":          "lightweight",
			},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"tournament_id": tourney.ID.String(),
				"name":          "lightweight",
				"status":        "upcoming",
				"format":        "pool_then_direct_elimination",
			},
		},
		{
			name: "rejects a missing name before the handler runs",
			body: map[string]any{
				"tournament_id": tourney.ID.String(),
			},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, NewFakeTournamentLookup(tourney)).Post("/api/v1/events", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestListEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	seed := []event.Event{
		seededEvent(event.EventStatusUpcoming, tournamentID),
		seededEvent(event.EventStatusActive, tournamentID),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).Get("/api/v1/events?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("filters by tournament_id and status", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).
			Get("/api/v1/events?tournament_id=" + tournamentID.String() + "&status=active")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.InDelta(t, 1, body["total"], 0)
	})

	t.Run("rejects a status outside the enum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), seed...).Get("/api/v1/events?status=nope")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestGetAndUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededEvent(event.EventStatusUpcoming, uuid.New())

	t.Run("returns the stored event", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).Get("/api/v1/events/" + stored.ID.String())

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).Get("/api/v1/events/" + uuid.New().String())

		assert.Equal(t, http.StatusNotFound, resp.Code)
	})

	t.Run("patches only the fields present in the body", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, NewFakeTournamentLookup(), stored).
			Patch("/api/v1/events/"+stored.ID.String(), map[string]any{"name": "heavyweight"})

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Equal(t, "heavyweight", body["name"])
	})
}

func TestDeleteEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededEvent(event.EventStatusUpcoming, uuid.New())
	api := newTestAPI(t, NewFakeTournamentLookup(), stored)
	base := "/api/v1/events/" + stored.ID.String()

	deleted := api.Delete(base)
	require.Equal(t, http.StatusNoContent, deleted.Code, "body: %s", deleted.Body)
	assert.Empty(t, deleted.Body.String())

	assert.Equal(t, http.StatusNotFound, api.Get(base).Code)
	assert.Equal(t, http.StatusNotFound, api.Delete(base).Code)
}

func TestDeleteEndpointRefusesActiveEvent(t *testing.T) {
	t.Parallel()

	stored := seededEvent(event.EventStatusActive, uuid.New())
	api := newTestAPI(t, NewFakeTournamentLookup(), stored)

	assert.Equal(t, http.StatusConflict, api.Delete("/api/v1/events/"+stored.ID.String()).Code)
}
