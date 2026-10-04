package config

import "fmt"

const DefaultEnvironment = "dev"

type Configuration struct {
	App         AppConfig
	Database    DatabaseConfig
	Redis       RedisConfig
	Environment string
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

	return &Configuration{
		App:         *appConfig,
		Database:    *databaseConfig,
		Redis:       *redisConfig,
		Environment: stringEnv("APP_ENVIRONMENT", DefaultEnvironment),
	}, nil
}
