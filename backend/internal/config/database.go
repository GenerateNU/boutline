package config

import (
	"fmt"
	"time"

	"github.com/go-playground/validator/v10"
)

const (
	DefaultDBHost            = "localhost"
	DefaultDBPort            = 5432
	DefaultDBName            = "boutline"
	DefaultDBUser            = "postgres"
	DefaultDBPassword        = "postgres"
	DefaultDBSSLMode         = "disable"
	DefaultDBMaxOpenConns    = 25
	DefaultDBMaxIdleConns    = 5
	DefaultDBConnMaxLifetime = time.Hour
)

type DatabaseConfig struct {
	Host            string        `validate:"required"`
	Port            int           `validate:"required,gt=0,lte=65535"`
	Name            string        `validate:"required"`
	User            string        `validate:"required"`
	Password        string        `validate:"required"`
	SSLMode         string        `validate:"required,oneof=disable allow prefer require verify-ca verify-full"`
	MaxOpenConns    int           `validate:"required,gt=0"`
	MaxIdleConns    int           `validate:"gte=0,ltefield=MaxOpenConns"`
	ConnMaxLifetime time.Duration `validate:"required,gt=0"`
}

func LoadDatabaseConfig() (*DatabaseConfig, error) {
	port, err := intEnv("DB_PORT", DefaultDBPort)
	if err != nil {
		return nil, err
	}

	maxOpenConns, err := intEnv("DB_MAX_OPEN_CONNS", DefaultDBMaxOpenConns)
	if err != nil {
		return nil, err
	}

	maxIdleConns, err := intEnv("DB_MAX_IDLE_CONNS", DefaultDBMaxIdleConns)
	if err != nil {
		return nil, err
	}

	connMaxLifetime, err := durationEnv("DB_CONN_MAX_LIFETIME", DefaultDBConnMaxLifetime)
	if err != nil {
		return nil, err
	}

	cfg := &DatabaseConfig{
		Host:            stringEnv("DB_HOST", DefaultDBHost),
		Port:            port,
		Name:            stringEnv("DB_NAME", DefaultDBName),
		User:            stringEnv("DB_USER", DefaultDBUser),
		Password:        stringEnv("DB_PASSWORD", DefaultDBPassword),
		SSLMode:         stringEnv("DB_SSL_MODE", DefaultDBSSLMode),
		MaxOpenConns:    maxOpenConns,
		MaxIdleConns:    maxIdleConns,
		ConnMaxLifetime: connMaxLifetime,
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid DatabaseConfig: %w", err)
	}

	return cfg, nil
}

// DSN carries the password, so it is never logged — pass it straight to the
// driver and log cfg.Host / cfg.Name instead.
func (c DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode,
	)
}
