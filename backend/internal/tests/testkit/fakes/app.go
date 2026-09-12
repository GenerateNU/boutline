package fakes

import (
	"sync"

	"boutline/internal/config"
	"boutline/internal/server"

	"github.com/gofiber/fiber/v2"
)

const TestEnvironment = "test"

var (
	sharedApp *fiber.App
	once      sync.Once
)

// GetSharedTestApp returns the real application wiring — same middlewares,
// routes, and error handler as production. It is built once per test binary so
// parallel tests share one instance.
func GetSharedTestApp() *fiber.App {
	once.Do(func() {
		// nil DB: the app builds and every route registers, but a test that
		// actually hits a database-backed feature needs a real connection here.
		sharedApp = server.CreateApp(TestConfiguration(), nil)
	})

	return sharedApp
}

// TestConfiguration is built in code rather than loaded from the environment so
// integration tests assert against fixed values regardless of the developer's
// shell. Environment parsing itself is covered by the config package's tests.
func TestConfiguration() *config.Configuration {
	return &config.Configuration{
		App: config.AppConfig{
			Name:           config.DefaultAppName,
			Version:        config.DefaultAppVersion,
			Port:           config.DefaultAppPort,
			AllowedOrigins: config.DefaultAllowedOrigins,
		},
		Database: config.DatabaseConfig{
			Host:            config.DefaultDBHost,
			Port:            config.DefaultDBPort,
			Name:            config.DefaultDBName,
			User:            config.DefaultDBUser,
			Password:        config.DefaultDBPassword,
			SSLMode:         config.DefaultDBSSLMode,
			MaxOpenConns:    config.DefaultDBMaxOpenConns,
			MaxIdleConns:    config.DefaultDBMaxIdleConns,
			ConnMaxLifetime: config.DefaultDBConnMaxLifetime,
		},
		Environment: TestEnvironment,
	}
}
