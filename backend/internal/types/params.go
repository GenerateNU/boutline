package types //nolint:revive

import (
	"boutline/internal/config"

	"github.com/go-playground/validator/v10"
)

// RouteParams is what CreateApp hands to the routers; each router pulls the
// pieces it needs out of ServiceParams and constructs its own service.
type RouteParams struct {
	Validator     *validator.Validate
	ServiceParams *ServiceParams
}

type ServiceParams struct {
	Config *config.Configuration
}
