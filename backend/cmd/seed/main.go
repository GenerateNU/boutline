// Command seed fills a development database with the fixtures the app needs to
// be usable by hand. Each seeder is idempotent — a record that already exists is
// left untouched — so the command is safe to re-run.
//
// Some fixtures embed credentials that are public knowledge, so the command
// refuses to run anywhere but APP_ENVIRONMENT=dev.
//
// To add a fixture: write a Seeder in its own file here and add it to seeders().
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"boutline/internal/config"
	"boutline/internal/database"

	"gorm.io/gorm"
)

const dbConnectTimeout = 10 * time.Second

// Result is what a seeder reports: rows it inserted, and rows that were already
// there and so were left alone.
type Result struct {
	Created int
	Skipped int
}

type Seeder struct {
	Name string
	Run  func(ctx context.Context, db *gorm.DB) (Result, error)
}

// Every fixture this command knows how to insert, in the order it runs them —
// put a seeder after anything it depends on.
func seeders() []Seeder {
	return []Seeder{
		{Name: "users", Run: seedUsers},
	}
}

func main() {
	if err := run(); err != nil {
		slog.Error("seed failed", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.LoadConfiguration()
	if err != nil {
		return fmt.Errorf("load configuration: %w", err)
	}

	if cfg.Environment != config.DefaultEnvironment {
		return fmt.Errorf("refusing to seed: APP_ENVIRONMENT is %q, not %q", cfg.Environment, config.DefaultEnvironment)
	}

	ctx, cancel := context.WithTimeout(context.Background(), dbConnectTimeout)
	defer cancel()

	db, err := database.Connect(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer func() {
		if err := database.Close(db); err != nil {
			slog.Error("close database", "err", err)
		}
	}()

	for _, seeder := range seeders() {
		result, err := seeder.Run(ctx, db)
		if err != nil {
			return fmt.Errorf("seed %s: %w", seeder.Name, err)
		}
		slog.Info("seeded", "fixture", seeder.Name, "created", result.Created, "skipped", result.Skipped)
	}

	return nil
}
