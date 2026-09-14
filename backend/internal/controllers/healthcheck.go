package controllers

import (
	"context"

	"boutline/internal/config"
)

// Healthcheck reports what the running process is. There is no state to read
// and nothing to decide, so it is the one feature with no service or repository
// beneath it.
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
