package config

import (
	"errors"
	"fmt"
	"os"
)

const (
	DefaultEnvironment = "dev"
	// DevJWTSecret lets a dev checkout run without a secret, but only where
	// APP_ENVIRONMENT=dev is set explicitly; every other environment must set
	// its own JWT_SECRET or the server refuses to start.
	DevJWTSecret      = "dev-only-insecure-jwt-signing-secret-do-not-use-in-prod"
	minJWTSecretBytes = 32
)

type Configuration struct {
	App         AppConfig
	Database    DatabaseConfig
	Redis       RedisConfig
	Environment string
	JWTSecret   string
}

func LoadConfiguration() (*Configuration, error) {
	appConfig, err := LoadAppConfig()
	if err != nil {
		return nil, fmt.Errorf("load app config: %w", err)
	}

	databaseConfig, err := LoadDatabaseConfig()
	if err != nil {
		return nil, fmt.Errorf("load database config: %w", err)
	}

	redisConfig, err := LoadRedisConfig()
	if err != nil {
		return nil, fmt.Errorf("load redis config: %w", err)
	}

	jwtSecret, err := loadJWTSecret()
	if err != nil {
		return nil, fmt.Errorf("load jwt secret: %w", err)
	}

	return &Configuration{
		App:         *appConfig,
		Database:    *databaseConfig,
		Redis:       *redisConfig,
		Environment: stringEnv("APP_ENVIRONMENT", DefaultEnvironment),
		JWTSecret:   jwtSecret,
	}, nil
}

// loadJWTSecret reads APP_ENVIRONMENT raw rather than through its "dev"
// default, so a deploy that forgets to set it fails to start instead of
// silently signing tokens with the public dev secret.
func loadJWTSecret() (string, error) {
	devOptIn := os.Getenv("APP_ENVIRONMENT") == DefaultEnvironment

	jwtSecret := stringEnv("JWT_SECRET", "")
	if jwtSecret == "" && devOptIn {
		jwtSecret = DevJWTSecret
	}
	if jwtSecret == DevJWTSecret && !devOptIn {
		return "", errors.New("the built-in dev JWT secret requires APP_ENVIRONMENT=dev")
	}
	// HS256 needs a key at least as long as its 256-bit output to be secure.
	if len(jwtSecret) < minJWTSecretBytes {
		return "", fmt.Errorf("JWT_SECRET must be set to at least %d bytes", minJWTSecretBytes)
	}

	return jwtSecret, nil
}
