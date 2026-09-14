package example

import "time"

// The wire format for this feature. Huma builds the OpenAPI schema from the
// tags on these structs and validates every request against it before a
// handler method runs, so the tags are the API contract. None of this is the
// persistence shape — that is model.go, and the mapping between them lives
// below.

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

// ExampleUpdateBody is a patch, so every field is a pointer: nil means "leave
// it alone", which a bare empty string could not express.
type ExampleUpdateBody struct {
	Name   *string        `json:"name,omitempty" minLength:"1" maxLength:"120" doc:"New name, unique among live examples"`
	Status *ExampleStatus `json:"status,omitempty" enum:"active,archived" doc:"New status"`
}

type ExampleUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Example ID"`
	Body ExampleUpdateBody
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
