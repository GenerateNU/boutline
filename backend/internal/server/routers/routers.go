package routers

import (
	"boutline/internal/features/health"
	"boutline/internal/features/tournament"
	"boutline/internal/types"

	"github.com/gofiber/fiber/v2"
)

// SetUpRoutes mounts every feature. A feature owns its own routes file under
// internal/features/<name> and is registered with one call from here.
func SetUpRoutes(app *fiber.App, routeParams types.RouteParams) {
	health.RegisterHealthRoutes(routeParams.API, routeParams.ServiceParams)
	tournament.RegisterTournamentRoutes(routeParams.API, routeParams.ServiceParams)

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
