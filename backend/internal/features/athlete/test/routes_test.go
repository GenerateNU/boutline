package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/features/athlete"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T) humatest.TestAPI {
	t.Helper()
	_, api := humatest.New(t)
	athlete.RegisterAthleteService(api, athlete.NewAthleteService(NewFakeAthleteRepository()))
	return api
}

func TestAthleteEndpoints(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		path       string
		wantStatus int
		wantKeys   []string
	}{
		{
			name: "profile exposes only public fields", path: "/api/v1/athletes/" + MayaID.String(),
			wantStatus: http.StatusOK, wantKeys: []string{"claimed", "firstName", "id", "lastName"},
		},
		{name: "unknown profile", path: "/api/v1/athletes/" + uuid.NewString(), wantStatus: http.StatusNotFound},
		{name: "malformed id", path: "/api/v1/athletes/nope", wantStatus: http.StatusUnprocessableEntity},
		{
			name: "history", path: "/api/v1/athletes/" + MayaID.String() + "/competitors",
			wantStatus: http.StatusOK, wantKeys: []string{"data", "limit", "offset", "total"},
		},
		{name: "search", path: "/api/v1/athletes?q=maya", wantStatus: http.StatusOK, wantKeys: []string{"data", "limit", "offset", "total"}},
		{name: "search without q", path: "/api/v1/athletes", wantStatus: http.StatusUnprocessableEntity},
		{name: "search with blank q", path: "/api/v1/athletes?q=%20%20", wantStatus: http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			resp := newTestAPI(t).Get(tt.path)
			require.Equal(t, tt.wantStatus, resp.Code, resp.Body.String())
			if tt.wantKeys == nil {
				return
			}
			var body map[string]any
			require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
			keys := make([]string, 0, len(body))
			for k := range body {
				keys = append(keys, k)
			}
			assert.ElementsMatch(t, tt.wantKeys, keys)
		})
	}
}
