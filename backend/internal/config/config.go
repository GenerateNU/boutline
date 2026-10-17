package config

import "fmt"

const (
	DefaultEnvironment = "dev"
	// DevJWTSecret lets a fresh dev checkout run without setup; every other
	// environment must set JWT_SECRET or the server refuses to start.
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

	environment := stringEnv("APP_ENVIRONMENT", DefaultEnvironment)

	jwtSecret := stringEnv("JWT_SECRET", "")
	if jwtSecret == "" && environment == DefaultEnvironment {
		jwtSecret = DevJWTSecret
	}
	// HS256 needs a key at least as long as its 256-bit output to be secure.
	if len(jwtSecret) < minJWTSecretBytes {
		return nil, fmt.Errorf("JWT_SECRET must be set to at least %d bytes", minJWTSecretBytes)
	}

	return &Configuration{
		App:         *appConfig,
		Database:    *databaseConfig,
		Redis:       *redisConfig,
		Environment: environment,
		JWTSecret:   jwtSecret,
	}, nil
}
