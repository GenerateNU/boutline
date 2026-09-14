package health

// The wire format for this feature. Huma builds the OpenAPI schema from the
// tags on these structs, the same as every other feature — there is just no
// input type, since the operation takes nothing.

type HealthResponse struct {
	Status      string `json:"status" enum:"ok"`
	Name        string `json:"name"`
	Version     string `json:"version"`
	Environment string `json:"environment"`
}

type HealthOutput struct {
	Body HealthResponse
}
