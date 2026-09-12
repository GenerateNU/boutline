package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/example"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The handler is exercised over the real service and a fake repository: the
// mapping, the validation Huma derives from the struct tags, and the status
// codes errs.HumaError picks are all only observable end to end, and none of
// them needs a database.
func newTestAPI(t *testing.T, seed ...example.Example) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	example.RegisterExampleHandler(api, example.NewExampleHandler(example.NewExampleService(NewFakeExampleRepository(seed...))))

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
		seed       []example.Example
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "creates an example and echoes the stored row",
			body:       map[string]any{"name": "  from http  "},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"name": "from http", "status": "active"},
		},
		{
			name:       "rejects a blank name before the handler runs",
			body:       map[string]any{"name": ""},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a status outside the enum",
			body:       map[string]any{"name": "fine", "status": "nope"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			// The client can act on this one, so it gets a real message rather
			// than the wrapped chain the service built on the way up.
			name:       "reports a duplicate name as a conflict the client can read",
			seed:       []example.Example{seeded("taken", example.ExampleStatusActive)},
			body:       map[string]any{"name": "taken"},
			wantStatus: http.StatusConflict,
			wantFields: map[string]any{"detail": `an example named "taken" already exists`},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, tt.seed...).Post("/api/v1/examples", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestFindByIDEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", example.ExampleStatusActive)

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "returns the stored example", path: stored.ID.String(), wantStatus: http.StatusOK},
		{name: "reports an unknown id as not found", path: uuid.New().String(), wantStatus: http.StatusNotFound},
		{name: "rejects an id that is not a uuid", path: "not-a-uuid", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Get("/api/v1/examples/" + tt.path)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestListEndpoint(t *testing.T) {
	t.Parallel()

	seed := []example.Example{
		seeded("a active", example.ExampleStatusActive),
		seeded("b archived", example.ExampleStatusArchived),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/examples?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("rejects a limit above the maximum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/examples?limit=500")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestDeleteEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("doomed", example.ExampleStatusActive)

	t.Run("deletes once and then reports not found", func(t *testing.T) {
		t.Parallel()

		api := newTestAPI(t, stored)
		path := "/api/v1/examples/" + stored.ID.String()

		require.Equal(t, http.StatusNoContent, api.Delete(path).Code)
		assert.Equal(t, http.StatusNotFound, api.Get(path).Code)
		assert.Equal(t, http.StatusNotFound, api.Delete(path).Code)
	})
}
