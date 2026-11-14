package testkit

import (
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

// Creates an application with Postgres and Redis, for testing
// If REQUIRE_DB is true, fails when Postgres and/or Redis are unreachable,
// otherwise skips silently
func GetDBAndCacheTestApp(t *testing.T) (*fiber.App, *redis.Client, *gorm.DB) {
	t.Helper()

	dbCacheOnce.Do(func() {
		dbCfg, err := config.LoadDatabaseConfig()
		if err != nil {
			dbCacheErr = err
			return
		}

		db, err := database.Connect(t.Context(), *dbCfg)
		if err != nil {
			dbCacheErr = err
			return
		}

		redisCfg, err := config.LoadRedisConfig()
		if err != nil {
			dbCacheErr = err
			return
		}

		redisClient, err := cache.Connect(t.Context(), *redisCfg)
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
