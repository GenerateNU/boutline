package testkit

import (
	"context"
	"os"
	"sync"
	"testing"

	"boutline/internal/config"
	"boutline/internal/database"
	"boutline/internal/server"
	"boutline/internal/tests/testkit/fakes"

	"github.com/gofiber/fiber/v2"
)

var (
	dbApp  *fiber.App
	dbErr  error
	dbOnce sync.Once
)

// GetDBTestApp returns the real application wiring against a real Postgres
// connection, read from the same DB_* env vars production uses. Most local
// runs of `go test ./...` have no database reachable, so a test calling this
// is skipped rather than failed when the connection can't be made -- only
// `make test-integration-db` and CI's `seed` job provide one. Those set
// REQUIRE_DB, which turns a connection failure into a hard failure instead of
// a skip, so a flaky or misconfigured database can't make the suite pass
// green without running.
func GetDBTestApp(t *testing.T) *fiber.App {
	t.Helper()

	dbOnce.Do(func() {
		dbCfg, err := config.LoadDatabaseConfig()
		if err != nil {
			dbErr = err
			return
		}

		db, err := database.Connect(context.Background(), *dbCfg)
		if err != nil {
			dbErr = err
			return
		}

		dbApp = server.CreateApp(fakes.TestConfiguration(), db, nil)
	})

	if dbErr != nil {
		if os.Getenv("REQUIRE_DB") != "" {
			t.Fatalf("database required but setup failed: %v", dbErr)
		}
		t.Skipf("no database reachable, skipping: %v", dbErr)
	}

	return dbApp
}
