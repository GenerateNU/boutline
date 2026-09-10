package server

import (
	"fmt"

	"boutline/internal/config"
	"boutline/internal/errs"
	"boutline/internal/server/middlewares"
	"boutline/internal/server/routers"
	"boutline/internal/types"
	"boutline/internal/validators"

	"github.com/gofiber/fiber/v2"
)

func CreateApp(cfg *config.Configuration) *fiber.App {
	app := fiber.New(fiber.Config{
		ServerHeader: cfg.App.Name,
		AppName:      fmt.Sprintf("%s API %s", cfg.App.Name, cfg.App.Version),
		ErrorHandler: errs.ErrorHandler,
	})

	middlewares.SetUpMiddlewares(app, cfg)

	routers.SetUpRoutes(app, types.RouteParams{
		Validator: validators.NewValidator(),
		ServiceParams: &types.ServiceParams{
			Config: cfg,
		},
	})

	return app
}
