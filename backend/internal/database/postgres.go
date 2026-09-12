package database

import (
	"context"
	"fmt"

	"boutline/internal/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens the pool and verifies it. gorm.Open is lazy, so without the
// ping a bad host or password would only surface on the first request.
func Connect(ctx context.Context, cfg config.DatabaseConfig) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		// Turns driver errors into gorm.ErrDuplicatedKey and friends, so
		// repositories map to errs sentinels without importing pgx.
		TranslateError: true,
		Logger:         logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("access sql pool: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	return db, nil
}

func Close(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("access sql pool: %w", err)
	}

	if err := sqlDB.Close(); err != nil {
		return fmt.Errorf("close postgres: %w", err)
	}

	return nil
}
