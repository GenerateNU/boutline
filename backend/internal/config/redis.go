package config

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

const (
	DefaultRedisHost     = "localhost"
	DefaultRedisPort     = 6379
	DefaultRedisPassword = ""
	DefaultRedisDB       = 0
)

type RedisConfig struct {
	Host     string `validate:"required"`
	Port     int    `validate:"required,gt=0,lte=65535"`
	Password string
	DB       int `validate:"gte=0"`
}

func LoadRedisConfig() (*RedisConfig, error) {
	port, err := intEnv("REDIS_PORT", DefaultRedisPort)
	if err != nil {
		return nil, err
	}

	db, err := intEnv("REDIS_DB", DefaultRedisDB)
	if err != nil {
		return nil, err
	}

	cfg := &RedisConfig{
		Host:     stringEnv("REDIS_HOST", DefaultRedisHost),
		Port:     port,
		Password: stringEnv("REDIS_PASSWORD", DefaultRedisPassword),
		DB:       db,
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid RedisConfig: %w", err)
	}

	return cfg, nil
}

func (c RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}
