package testkit

import (
	"context"
	"os"
	"sync"
	"testing"

	"boutline/internal/cache"
	"boutline/internal/config"
	"boutline/internal/database"
	"boutline/internal/server"
	"boutline/internal/tests/testkit/fakes"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

var (
	dbCacheApp    *fiber.App
	dbCacheDB     *gorm.DB
	dbCacheClient *redis.Client
	dbCacheErr    error
	dbCacheOnce   sync.Once
)

// GetDBAndCacheTestApp returns the real application wiring against both a
// real Postgres connection and a real Redis connection, for tests that need
// to observe the cache layer itself rather than just the database underneath
// it. It also returns the raw db and redis handles, so a test can mutate the
// database directly (bypassing the API, and so the cache) or inspect cache
// keys directly.
//
// Same skip-unless-reachable/REQUIRE_DB-fails-hard behavior as GetDBTestApp:
// both services come from the same docker-compose `test` profile, so a
// reachable database implies a reachable Redis.
func GetDBAndCacheTestApp(t *testing.T) (*fiber.App, *redis.Client, *gorm.DB) {
	t.Helper()

	dbCacheOnce.Do(func() {
		dbCfg, err := config.LoadDatabaseConfig()
		if err != nil {
			dbCacheErr = err
			return
		}

		db, err := database.Connect(context.Background(), *dbCfg)
		if err != nil {
			dbCacheErr = err
			return
		}

		redisCfg, err := config.LoadRedisConfig()
		if err != nil {
			dbCacheErr = err
			return
		}

		redisClient, err := cache.Connect(context.Background(), *redisCfg)
		if err != nil {
			dbCacheErr = err
			return
		}

		dbCacheApp = server.CreateApp(fakes.TestConfiguration(), db, redisClient)
		dbCacheDB = db
		dbCacheClient = redisClient
	})

	if dbCacheErr != nil {
		if os.Getenv("REQUIRE_DB") != "" {
			t.Fatalf("database and redis required but setup failed: %v", dbCacheErr)
		}
		t.Skipf("no database/redis reachable, skipping: %v", dbCacheErr)
	}

	return dbCacheApp, dbCacheClient, dbCacheDB
}
