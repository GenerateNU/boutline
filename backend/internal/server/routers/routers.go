package routers

import (
	"boutline/internal/controllers"
	"boutline/internal/types"

	"github.com/gofiber/fiber/v2"
)

// SetUpRoutes mounts every router. Feature routers take the /api/v1 group and
// live in their own file next to this one.
func SetUpRoutes(app *fiber.App, routeParams types.RouteParams) {
	app.Get("/healthcheck", controllers.HealthcheckHandler(routeParams.ServiceParams.Config))

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
