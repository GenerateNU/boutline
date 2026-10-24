package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/competitor"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, seed ...competitor.Competitor) humatest.TestAPI {
	t.Helper()
	_, api := humatest.New(t)
	competitor.RegisterCompetitorService(api, NewTestService(NewFakeCompetitorRepository(seed...)))
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

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "creates a competitor with only the required fields",
			body:       map[string]any{"tournamentId": TestTournamentID.String(), "firstName": "Lee", "lastName": "Kiefer"},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"firstName": "Lee", "rating": "U", "team": ""},
		},
		{
			name:       "rejects a rating outside the enum before the handler runs",
			body:       map[string]any{"tournamentId": TestTournamentID.String(), "firstName": "Lee", "lastName": "Kiefer", "rating": "Z"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a missing last name",
			body:       map[string]any{"tournamentId": TestTournamentID.String(), "firstName": "Lee"},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			resp := newTestAPI(t).Post("/api/v1/competitors", tt.body)
			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestGetByIDEndpoint(t *testing.T) {
	t.Parallel()
	stored := seeded("Lee", "Kiefer", competitor.RatingA, "")

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "returns the stored competitor", path: stored.ID.String(), wantStatus: http.StatusOK},
		{name: "reports an unknown id as not found", path: uuid.New().String(), wantStatus: http.StatusNotFound},
		{name: "rejects an id that is not a uuid", path: "not-a-uuid", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			resp := newTestAPI(t, stored).Get("/api/v1/competitors/" + tt.path)
			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestListEndpoint(t *testing.T) {
	t.Parallel()
	seed := []competitor.Competitor{
		seeded("A", "Adams", competitor.RatingU, ""),
		seeded("B", "Baker", competitor.RatingU, ""),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).Get("/api/v1/competitors?limit=1")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
	})

	t.Run("rejects a limit above the maximum", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).Get("/api/v1/competitors?limit=500")
		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("filters by rating from the query string", func(t *testing.T) {
		t.Parallel()
		mixed := []competitor.Competitor{
			seeded("A", "Adams", competitor.RatingA, ""),
			seeded("B", "Baker", competitor.RatingB, ""),
		}
		resp := newTestAPI(t, mixed...).Get("/api/v1/competitors?rating=A")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 1, body["total"], 0)
	})

	t.Run("filters by team from the query string", func(t *testing.T) {
		t.Parallel()
		mixed := []competitor.Competitor{
			seeded("A", "Adams", competitor.RatingU, "NU Fencing"),
			seeded("B", "Baker", competitor.RatingU, "BU Fencing"),
		}
		resp := newTestAPI(t, mixed...).Get("/api/v1/competitors?team=NU%20Fencing")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 1, body["total"], 0)
	})

	t.Run("filters by tournament", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).
			Get("/api/v1/competitors?tournament_id=" + TestTournamentID.String())
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 2)
	})

	// tournament_id carries no format:"uuid" tag, so a bad value reaches the
	// service and comes back as a 400 rather than Huma's 422.
	t.Run("rejects a tournament id that is not a uuid with a 400", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).Get("/api/v1/competitors?tournament_id=not-a-uuid")
		assert.Equal(t, http.StatusBadRequest, resp.Code, "body: %s", resp.Body)
	})

	t.Run("rejects a rating outside the enum", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).Get("/api/v1/competitors?rating=Z")
		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("matches by name when a query is given", func(t *testing.T) {
		t.Parallel()
		named := []competitor.Competitor{
			seeded("Lee", "Kiefer", competitor.RatingA, "NU Fencing"),
			seeded("Race", "Imboden", competitor.RatingA, "St. John's Fencing"),
		}
		resp := newTestAPI(t, named...).Get("/api/v1/competitors?q=kiefer")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 1, body["total"], 0)
	})
}

func TestListTeamsEndpoint(t *testing.T) {
	t.Parallel()
	seed := []competitor.Competitor{
		seeded("Lee", "Kiefer", competitor.RatingA, "NU Fencing"),
		seeded("Jon", "Doe", competitor.RatingA, "NU Fencing"),
		seeded("Race", "Imboden", competitor.RatingA, "St. John's Fencing"),
	}

	t.Run("returns one row per matching team with its competitor count", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).
			Get("/api/v1/tournaments/" + TestTournamentID.String() + "/teams?q=fencing")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 2)
		assert.InDelta(t, 2, body["total"], 0)
	})

	t.Run("a missing query lists every team", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).
			Get("/api/v1/tournaments/" + TestTournamentID.String() + "/teams")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 2)
	})

	// The tournament is a path parameter tagged format:"uuid", so Huma
	// rejects a malformed one before the service runs.
	t.Run("rejects a tournament id that is not a uuid", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments/not-a-uuid/teams")
		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("404s for a tournament that does not exist", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments/" + uuid.New().String() + "/teams")
		assert.Equal(t, http.StatusNotFound, resp.Code, "body: %s", resp.Body)
	})
}

func TestUpdateEndpoint(t *testing.T) {
	t.Parallel()
	stored := seeded("Lee", "Kiefer", competitor.RatingB, "NU Fencing")

	t.Run("patches only the fields present in the body", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, stored).Patch("/api/v1/competitors/"+stored.ID.String(), map[string]any{"rating": "A"})
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Equal(t, "A", body["rating"])
		assert.Equal(t, "NU Fencing", body["team"])
	})
	t.Run("clears the team when an empty string is provided", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, stored).Patch("/api/v1/competitors/"+stored.ID.String(), map[string]any{"team": ""})
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Equal(t, "", body["team"])
	})

	t.Run("rejects an empty patch", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, stored).Patch("/api/v1/competitors/"+stored.ID.String(), map[string]any{})
		assert.Equal(t, http.StatusBadRequest, resp.Code)
	})
}

func TestDeleteEndpoint(t *testing.T) {
	t.Parallel()
	stored := seeded("Lee", "Kiefer", competitor.RatingU, "")

	t.Run("deletes once and then reports not found", func(t *testing.T) {
		t.Parallel()
		api := newTestAPI(t, stored)
		path := "/api/v1/competitors/" + stored.ID.String()
		require.Equal(t, http.StatusNoContent, api.Delete(path).Code)
		assert.Equal(t, http.StatusNotFound, api.Get(path).Code)
		assert.Equal(t, http.StatusNotFound, api.Delete(path).Code)
	})
}

func TestListTournamentTeamsEndpoint(t *testing.T) {
	t.Parallel()
	seed := []competitor.Competitor{
		seeded("A", "Adams", competitor.RatingU, "NU Fencing"),
		seeded("B", "Baker", competitor.RatingU, "NU Fencing"),
		seeded("C", "Clark", competitor.RatingU, ""),
	}

	t.Run("returns the paginated envelope", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).
			Get("/api/v1/tournaments/" + TestTournamentID.String() + "/teams")
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Equal(t, float64(1), body["total"])
		assert.Equal(t, float64(20), body["limit"])
		assert.Equal(t, float64(0), body["offset"])

		data, ok := body["data"].([]any)
		require.True(t, ok)
		require.Len(t, data, 1)
		assert.Equal(t, map[string]any{"name": "NU Fencing", "competitorCount": float64(2)}, data[0])
	})

	// The path param does carry format:"uuid", so Huma rejects it before the handler.
	t.Run("rejects a path id that is not a uuid with a 422", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments/not-a-uuid/teams")
		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code, "body: %s", resp.Body)
	})

	t.Run("404s for a tournament that does not exist", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments/" + uuid.New().String() + "/teams")
		assert.Equal(t, http.StatusNotFound, resp.Code, "body: %s", resp.Body)
	})
}
