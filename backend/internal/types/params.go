package types //nolint:revive

import (
	"boutline/internal/config"

	"github.com/danielgtaylor/huma/v2"
	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

// RouteParams is what CreateApp hands to the routers; each feature pulls the
// pieces it needs out of ServiceParams and constructs its own service.
type RouteParams struct {
	API           huma.API
	Validator     *validator.Validate
	ServiceParams *ServiceParams
}

type ServiceParams struct {
	Config *config.Configuration
	DB     *gorm.DB
}
