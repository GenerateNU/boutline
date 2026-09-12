package example

import (
	"context"
	"fmt"
	"time"

	"boutline/internal/errs"

	"github.com/google/uuid"
)

// ExampleHandler owns the wire format. Huma builds the OpenAPI schema from the
// tags on these structs and rejects a bad request before the handler runs, so
// the checks left here are the ones a schema cannot express.
type ExampleHandler struct {
	service ExampleService
}

func NewExampleHandler(service ExampleService) *ExampleHandler {
	return &ExampleHandler{service: service}
}

type ExampleResponse struct {
	ID        string        `json:"id" format:"uuid"`
	Name      string        `json:"name"`
	Status    ExampleStatus `json:"status" enum:"active,archived"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
}

func newExampleResponse(example Example) ExampleResponse {
	return ExampleResponse{
		ID:        example.ID.String(),
		Name:      example.Name,
		Status:    example.Status,
		CreatedAt: example.CreatedAt,
		UpdatedAt: example.UpdatedAt,
	}
}

type ExampleCreateBody struct {
	Name   string        `json:"name" minLength:"1" maxLength:"120" doc:"Human-readable name, unique among live examples"`
	Status ExampleStatus `json:"status,omitempty" enum:"active,archived" doc:"Defaults to active"`
}

type ExampleCreateInput struct {
	Body ExampleCreateBody
}

// ExampleIDInput is shared by every route with an /{id} path — Huma reads the
// tag, so one struct covers them all.
type ExampleIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Example ID"`
}

type ExampleListInput struct {
	Status ExampleStatus `query:"status" enum:"active,archived" doc:"Filter by status"`
	Limit  int           `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int           `query:"offset" default:"0" minimum:"0"`
}

type ExampleOutput struct {
	Body ExampleResponse
}

type ExampleListBody struct {
	Data   []ExampleResponse `json:"data"`
	Total  int64             `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
}

type ExampleListOutput struct {
	Body ExampleListBody
}

func (h *ExampleHandler) CreateExample(ctx context.Context, input *ExampleCreateInput) (*ExampleOutput, error) {
	example, err := h.service.CreateExample(ctx, ExampleCreateParams{
		Name:   input.Body.Name,
		Status: input.Body.Status,
	})
	if err != nil {
		return nil, errs.HumaError(err)
	}

	return &ExampleOutput{Body: newExampleResponse(*example)}, nil
}

func (h *ExampleHandler) FindExampleByID(ctx context.Context, input *ExampleIDInput) (*ExampleOutput, error) {
	id, err := parseExampleID(input.ID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	example, err := h.service.FindExampleByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	return &ExampleOutput{Body: newExampleResponse(*example)}, nil
}

func (h *ExampleHandler) ListExamples(ctx context.Context, input *ExampleListInput) (*ExampleListOutput, error) {
	page, err := h.service.ListExamples(ctx, ExampleListParams{
		Status: input.Status,
		Limit:  input.Limit,
		Offset: input.Offset,
	})
	if err != nil {
		return nil, errs.HumaError(err)
	}

	data := make([]ExampleResponse, 0, len(page.Examples))
	for _, example := range page.Examples {
		data = append(data, newExampleResponse(example))
	}

	return &ExampleListOutput{Body: ExampleListBody{
		Data:   data,
		Total:  page.Total,
		Limit:  input.Limit,
		Offset: input.Offset,
	}}, nil
}

func (h *ExampleHandler) DeleteExample(ctx context.Context, input *ExampleIDInput) (*struct{}, error) {
	id, err := parseExampleID(input.ID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := h.service.DeleteExample(ctx, id); err != nil {
		return nil, errs.HumaError(err)
	}

	return nil, nil
}

func parseExampleID(raw string) (uuid.UUID, error) {
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, fmt.Errorf("parse example id %q: %w", raw, errs.ErrInvalidInput)
	}

	return id, nil
}
