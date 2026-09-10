package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadAppConfig(t *testing.T) {
	tests := []struct {
		name    string
		env     map[string]string
		want    AppConfig
		wantErr bool
	}{
		{
			name: "falls back to defaults when nothing is set",
			env:  map[string]string{},
			want: AppConfig{
				Name:           DefaultAppName,
				Version:        DefaultAppVersion,
				Port:           DefaultAppPort,
				AllowedOrigins: DefaultAllowedOrigins,
			},
		},
		{
			name: "environment overrides every default",
			env: map[string]string{
				"APP_NAME":            "boutline-api",
				"APP_VERSION":         "1.2.3",
				"APP_PORT":            "9090",
				"APP_ALLOWED_ORIGINS": "https://boutline.app",
			},
			want: AppConfig{
				Name:           "boutline-api",
				Version:        "1.2.3",
				Port:           9090,
				AllowedOrigins: "https://boutline.app",
			},
		},
		{
			name:    "rejects a non-numeric port",
			env:     map[string]string{"APP_PORT": "http"},
			wantErr: true,
		},
		{
			name:    "rejects a port outside the valid range",
			env:     map[string]string{"APP_PORT": "70000"},
			wantErr: true,
		},
		{
			name:    "rejects a zero port",
			env:     map[string]string{"APP_PORT": "0"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Every key is set explicitly — including to "" — so the developer's
			// own shell cannot leak into the defaults case. t.Setenv restores
			// the previous value, which rules out t.Parallel here.
			for _, key := range []string{"APP_NAME", "APP_VERSION", "APP_PORT", "APP_ALLOWED_ORIGINS"} {
				t.Setenv(key, tt.env[key])
			}

			got, err := LoadAppConfig()

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, got)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.want, *got)
		})
	}
}
