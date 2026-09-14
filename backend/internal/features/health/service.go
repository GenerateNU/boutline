// Package health reports what the running process is. It has no state to read
// and nothing to decide, so the feature template collapses to its wire types, a
// service, and its routes: no model and no repository, and the service reads
// the configuration where another feature would read a database.
package health

import (
	"context"

	"boutline/internal/config"
)

// HealthService is what routes.go registers with Huma, the same as every other
// feature's service.
type HealthService interface {
	CheckHealth(ctx context.Context, input *struct{}) (*HealthOutput, error)
}

type healthService struct {
	cfg *config.Configuration
}

func NewHealthService(cfg *config.Configuration) HealthService {
	return &healthService{cfg: cfg}
}

func (s *healthService) CheckHealth(_ context.Context, _ *struct{}) (*HealthOutput, error) {
	return &HealthOutput{Body: HealthResponse{
		Status:      "ok",
		Name:        s.cfg.App.Name,
		Version:     s.cfg.App.Version,
		Environment: s.cfg.Environment,
	}}, nil
}
