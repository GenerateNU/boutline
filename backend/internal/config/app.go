package config

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

const (
	DefaultAppName        = "boutline"
	DefaultAppVersion     = "dev"
	DefaultAppPort        = 8000
	DefaultAllowedOrigins = "*"
)

type AppConfig struct {
	Name           string `validate:"required"`
	Version        string `validate:"required"`
	Port           int    `validate:"required,gt=0,lte=65535"`
	AllowedOrigins string `validate:"required"`
}

func LoadAppConfig() (*AppConfig, error) {
	port, err := intEnv("APP_PORT", DefaultAppPort)
	if err != nil {
		return nil, err
	}

	cfg := &AppConfig{
		Name:           stringEnv("APP_NAME", DefaultAppName),
		Version:        stringEnv("APP_VERSION", DefaultAppVersion),
		Port:           port,
		AllowedOrigins: stringEnv("APP_ALLOWED_ORIGINS", DefaultAllowedOrigins),
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid AppConfig: %w", err)
	}

	return cfg, nil
}
