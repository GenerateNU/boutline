package controllers

import (
	"boutline/internal/config"

	"github.com/gofiber/fiber/v2"
)

func HealthcheckHandler(cfg *config.Configuration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":      "ok",
			"name":        cfg.App.Name,
			"version":     cfg.App.Version,
			"environment": cfg.Environment,
		})
	}
}
