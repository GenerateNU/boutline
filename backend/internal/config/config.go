package config

import "fmt"

const DefaultEnvironment = "dev"

type Configuration struct {
	App         AppConfig
	Environment string
}

func LoadConfiguration() (*Configuration, error) {
	appConfig, err := LoadAppConfig()
	if err != nil {
		return nil, fmt.Errorf("load app config: %w", err)
	}

	return &Configuration{
		App:         *appConfig,
		Environment: stringEnv("APP_ENVIRONMENT", DefaultEnvironment),
	}, nil
}
