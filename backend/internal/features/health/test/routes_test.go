// Package test holds the health feature's unit tests. There are no rules to
// test without HTTP — the service just reports the configuration it was built
// with — so this feature has a routes_test.go and no service_test.go.
package test

import (
	"encoding/json"
	"net/http"
	"testing"

	"boutline/internal/config"
	"boutline/internal/features/health"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthcheckEndpoint(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		cfg  *config.Configuration
		want map[string]any
	}{
		{
			name: "reports the running app",
			cfg: &config.Configuration{
				App:         config.AppConfig{Name: "boutline", Version: "1.2.3"},
				Environment: "dev",
			},
			want: map[string]any{
				"status":      "ok",
				"name":        "boutline",
				"version":     "1.2.3",
				"environment": "dev",
			},
		},
		{
			// Every field comes from the configuration, so a second deployment
			// reports itself rather than the defaults baked in at build time.
			name: "reports a different deployment",
			cfg: &config.Configuration{
				App:         config.AppConfig{Name: "boutline-staging", Version: "deadbeef"},
				Environment: "staging",
			},
			want: map[string]any{
				"status":      "ok",
				"name":        "boutline-staging",
				"version":     "deadbeef",
				"environment": "staging",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, api := humatest.New(t)
			health.RegisterHealthService(api, health.NewHealthService(tt.cfg))

			resp := api.Get("/healthcheck")

			require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

			var body map[string]any
			require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))
			assert.Equal(t, tt.want, body)
		})
	}
}
