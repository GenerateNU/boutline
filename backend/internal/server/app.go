package server

import (
	"fmt"

	"boutline/internal/config"
	"boutline/internal/errs"
	"boutline/internal/server/middlewares"
	"boutline/internal/server/routers"
	"boutline/internal/types"
	"boutline/internal/validators"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humafiber"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func CreateApp(cfg *config.Configuration, db *gorm.DB) *fiber.App {
	app := fiber.New(fiber.Config{
		ServerHeader: cfg.App.Name,
		AppName:      fmt.Sprintf("%s API %s", cfg.App.Name, cfg.App.Version),
		ErrorHandler: errs.ErrorHandler,
	})

	middlewares.SetUpMiddlewares(app, cfg)

	// Feature routes go through Huma, which generates the OpenAPI spec at
	// /openapi.json and the docs UI at /docs from the operations they register.
	humaConfig := huma.DefaultConfig(cfg.App.Name, cfg.App.Version)
	humaConfig.DocsRenderer = huma.DocsRendererSwaggerUI

	api := humafiber.NewV2(app, humaConfig)

	routers.SetUpRoutes(app, types.RouteParams{
		API:       api,
		Validator: validators.NewValidator(),
		ServiceParams: &types.ServiceParams{
			Config: cfg,
			DB:     db,
		},
	})

	return app
}
