package controllers

import (
	"context"

	"boutline/internal/config"
)

type HealthController struct {
	cfg *config.Configuration
}

func NewHealthController(cfg *config.Configuration) *HealthController {
	return &HealthController{cfg: cfg}
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

func (h *HealthController) CheckHealth(_ context.Context, _ *struct{}) (*HealthOutput, error) {
	return &HealthOutput{Body: HealthResponse{
		Status:      "ok",
		Name:        h.cfg.App.Name,
		Version:     h.cfg.App.Version,
		Environment: h.cfg.Environment,
	}}, nil
}
