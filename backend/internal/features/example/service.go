package example

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"boutline/internal/errs"

	"github.com/google/uuid"
)

const (
	ExampleDefaultPageSize = 20
	ExampleMaxPageSize     = 100
)

// ExampleService is where the rules live. It takes plain domain values, never a
// *fiber.Ctx or a Huma input struct, so a CLI or a job can call it too.
type ExampleService interface {
	CreateExample(ctx context.Context, params ExampleCreateParams) (*Example, error)
	FindExampleByID(ctx context.Context, id uuid.UUID) (*Example, error)
	ListExamples(ctx context.Context, params ExampleListParams) (*ExamplePage, error)
	DeleteExample(ctx context.Context, id uuid.UUID) error
}

type ExampleCreateParams struct {
	Name   string
	Status ExampleStatus
}

type ExampleListParams struct {
	Status ExampleStatus
	Limit  int
	Offset int
}

type ExamplePage struct {
	Examples []Example
	Total    int64
}

type exampleService struct {
	repo ExampleRepository
}

func NewExampleService(repo ExampleRepository) ExampleService {
	return &exampleService{repo: repo}
}

func (s *exampleService) CreateExample(ctx context.Context, params ExampleCreateParams) (*Example, error) {
	name := strings.TrimSpace(params.Name)
	if name == "" {
		return nil, fmt.Errorf("create example: %w",
			errs.Public("name must not be blank", errs.ErrInvalidInput))
	}

	status := params.Status
	if status == "" {
		status = ExampleStatusActive
	}
	if !status.IsValid() {
		return nil, fmt.Errorf("create example: %w",
			errs.Public(fmt.Sprintf("unknown status %q", status), errs.ErrInvalidInput))
	}

	example := &Example{Name: name, Status: status}
	if err := s.repo.CreateExample(ctx, example); err != nil {
		// The client can act on a name collision, so it gets the detail; the
		// rest of the chain stays in the log.
		if errors.Is(err, errs.ErrDuplicate) {
			return nil, fmt.Errorf("create example: %w",
				errs.Public(fmt.Sprintf("an example named %q already exists", name), err))
		}

		return nil, fmt.Errorf("create example: %w", err)
	}

	return example, nil
}

func (s *exampleService) FindExampleByID(ctx context.Context, id uuid.UUID) (*Example, error) {
	example, err := s.repo.FindExampleByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("find example: %w", err)
	}

	return example, nil
}

func (s *exampleService) ListExamples(ctx context.Context, params ExampleListParams) (*ExamplePage, error) {
	if params.Status != "" && !params.Status.IsValid() {
		return nil, fmt.Errorf("list examples: %w",
			errs.Public(fmt.Sprintf("unknown status %q", params.Status), errs.ErrInvalidInput))
	}

	// Clamped here rather than in the handler so every caller gets a bounded
	// page, not just the HTTP one.
	limit := params.Limit
	switch {
	case limit <= 0:
		limit = ExampleDefaultPageSize
	case limit > ExampleMaxPageSize:
		limit = ExampleMaxPageSize
	}

	offset := max(params.Offset, 0)

	examples, total, err := s.repo.ListExamples(ctx, ExampleListFilter{
		Status: params.Status,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("list examples: %w", err)
	}

	return &ExamplePage{Examples: examples, Total: total}, nil
}

func (s *exampleService) DeleteExample(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.DeleteExample(ctx, id); err != nil {
		return fmt.Errorf("delete example: %w", err)
	}

	return nil
}
