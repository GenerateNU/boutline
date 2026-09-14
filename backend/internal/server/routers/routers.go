package routers

import (
	"boutline/internal/features/health"
	"boutline/internal/types"

	"github.com/gofiber/fiber/v2"
)

// SetUpRoutes mounts every feature, each with one call from here. A feature
// owns its own routes file in this package; health is the exception and still
// keeps its own under internal/features/health.
func SetUpRoutes(app *fiber.App, routeParams types.RouteParams) {
	health.RegisterHealthRoutes(routeParams.API, routeParams.ServiceParams)
	RegisterUserRoutes(routeParams.API, routeParams.ServiceParams)

	// Fiber owns anything Huma did not claim, so the catch-all stays here.
	setUpNotFoundHandler(app)
}

func setUpNotFoundHandler(app *fiber.App) {
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Route not found",
			"path":  c.Path(),
		})
	})
}
