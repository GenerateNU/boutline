package config

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadJWTSecret(t *testing.T) {
	ownSecret := strings.Repeat("s", minJWTSecretBytes)

	tests := []struct {
		name        string
		environment string
		secret      string
		want        string
		wantErr     bool
	}{
		{name: "explicit dev falls back to the dev secret", environment: "dev", want: DevJWTSecret},
		{name: "explicit dev still prefers a secret that is set", environment: "dev", secret: ownSecret, want: ownSecret},
		{name: "production uses its own secret", environment: "production", secret: ownSecret, want: ownSecret},
		{name: "unset environment is not an opt-in to the dev secret", wantErr: true},
		{name: "production without a secret refuses to start", environment: "production", wantErr: true},
		{
			name: "unset environment rejects the dev secret even when set explicitly", secret: DevJWTSecret,
			wantErr: true,
		},
		{name: "production rejects the dev secret", environment: "production", secret: DevJWTSecret, wantErr: true},
		{name: "rejects a secret shorter than 32 bytes", environment: "production", secret: "short", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// t.Setenv restores the previous value, which rules out t.Parallel here.
			t.Setenv("APP_ENVIRONMENT", tt.environment)
			t.Setenv("JWT_SECRET", tt.secret)

			got, err := loadJWTSecret()

			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}
