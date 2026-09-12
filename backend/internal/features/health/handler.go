// Package health reports what the running process is. It has no model,
// repository, or service: there is no state to read and nothing to decide, so
// the five-file feature template collapses to a handler and its routes.
package health

import (
	"context"

	"boutline/internal/config"
)

type HealthHandler struct {
	cfg *config.Configuration
}

func NewHealthHandler(cfg *config.Configuration) *HealthHandler {
	return &HealthHandler{cfg: cfg}
}

type HealthResponse struct {
	Status      string `json:"status" enum:"ok"`
	Name        string `json:"name"`
	Version     string `json:"version"`
	Environment string `json:"environment"`
}

type HealthOutput struct {
	Body HealthResponse
}

func (h *HealthHandler) CheckHealth(_ context.Context, _ *struct{}) (*HealthOutput, error) {
	return &HealthOutput{Body: HealthResponse{
		Status:      "ok",
		Name:        h.cfg.App.Name,
		Version:     h.cfg.App.Version,
		Environment: h.cfg.Environment,
	}}, nil
}
