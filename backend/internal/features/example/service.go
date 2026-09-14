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

// ExampleService is the only layer above the repository: it takes the request
// types from types.go, applies the rules, and returns the response types.
// routes.go registers these methods with Huma directly, so by the time one runs
// Huma has already rejected anything the schema could describe — what is left
// here are the rules a schema cannot express.
type ExampleService interface {
	CreateExample(ctx context.Context, input *ExampleCreateInput) (*ExampleOutput, error)
	GetExampleByID(ctx context.Context, input *ExampleIDInput) (*ExampleOutput, error)
	ListExamples(ctx context.Context, input *ExampleListInput) (*ExampleListOutput, error)
	UpdateExampleByID(ctx context.Context, input *ExampleUpdateInput) (*ExampleOutput, error)
	DeleteExample(ctx context.Context, input *ExampleIDInput) (*struct{}, error)
}

type exampleService struct {
	repo ExampleRepository
}

func NewExampleService(repo ExampleRepository) ExampleService {
	return &exampleService{repo: repo}
}

func (s *exampleService) CreateExample(ctx context.Context, input *ExampleCreateInput) (*ExampleOutput, error) {
	name := strings.TrimSpace(input.Body.Name)
	if name == "" {
		return nil, errs.HumaError(errs.Public("name must not be blank", errs.ErrInvalidInput))
	}

	status := input.Body.Status
	if status == "" {
		status = ExampleStatusActive
	}
	if !status.IsValid() {
		return nil, errs.HumaError(
			errs.Public(fmt.Sprintf("unknown status %q", status), errs.ErrInvalidInput))
	}

	example := &Example{Name: name, Status: status}
	if err := s.repo.CreateExample(ctx, example); err != nil {
		// The client can act on a name collision, so it gets the detail; the
		// rest of the chain stays in the log.
		if errors.Is(err, errs.ErrDuplicate) {
			return nil, errs.HumaError(fmt.Errorf("create example: %w",
				errs.Public(fmt.Sprintf("an example named %q already exists", name), err)))
		}

		return nil, errs.HumaError(fmt.Errorf("create example: %w", err))
	}

	return &ExampleOutput{Body: newExampleResponse(*example)}, nil
}

func (s *exampleService) GetExampleByID(ctx context.Context, input *ExampleIDInput) (*ExampleOutput, error) {
	id, err := parseExampleID(input.ID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	example, err := s.repo.GetExampleByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get example: %w", err))
	}

	return &ExampleOutput{Body: newExampleResponse(*example)}, nil
}

func (s *exampleService) UpdateExampleByID(ctx context.Context, input *ExampleUpdateInput) (*ExampleOutput, error) {
	id, err := parseExampleID(input.ID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	update, err := exampleUpdateFrom(input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.UpdateExampleByID(ctx, id, update); err != nil {
		if errors.Is(err, errs.ErrDuplicate) {
			return nil, errs.HumaError(fmt.Errorf("update example: %w",
				errs.Public(fmt.Sprintf("an example named %q already exists", *update.Name), err)))
		}

		return nil, errs.HumaError(fmt.Errorf("update example: %w", err))
	}

	// Updates writes columns, not rows, so the response comes from a read of
	// what is now stored rather than from the patch.
	example, err := s.repo.GetExampleByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated example: %w", err))
	}

	return &ExampleOutput{Body: newExampleResponse(*example)}, nil
}

// exampleUpdateFrom applies the same rules as create to whichever fields the
// patch actually carries, and refuses a patch that would change nothing.
func exampleUpdateFrom(body ExampleUpdateBody) (ExampleUpdate, error) {
	var update ExampleUpdate

	if body.Name != nil {
		name := strings.TrimSpace(*body.Name)
		if name == "" {
			return update, errs.Public("name must not be blank", errs.ErrInvalidInput)
		}
		update.Name = &name
	}

	if body.Status != nil {
		if !body.Status.IsValid() {
			return update, errs.Public(
				fmt.Sprintf("unknown status %q", *body.Status), errs.ErrInvalidInput)
		}
		update.Status = body.Status
	}

	if update.Name == nil && update.Status == nil {
		return update, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return update, nil
}

func (s *exampleService) ListExamples(ctx context.Context, input *ExampleListInput) (*ExampleListOutput, error) {
	if input.Status != "" && !input.Status.IsValid() {
		return nil, errs.HumaError(
			errs.Public(fmt.Sprintf("unknown status %q", input.Status), errs.ErrInvalidInput))
	}

	// Clamped rather than trusted: Huma enforces the bounds on an HTTP request,
	// but a job calling this method directly gets a bounded page too.
	limit := input.Limit
	switch {
	case limit <= 0:
		limit = ExampleDefaultPageSize
	case limit > ExampleMaxPageSize:
		limit = ExampleMaxPageSize
	}

	offset := max(input.Offset, 0)

	examples, total, err := s.repo.ListExamples(ctx, ExampleListFilter{
		Status: input.Status,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list examples: %w", err))
	}

	data := make([]ExampleResponse, 0, len(examples))
	for _, example := range examples {
		data = append(data, newExampleResponse(example))
	}

	// The clamped values, not what was asked for, so the caller can tell which
	// page it actually got.
	return &ExampleListOutput{Body: ExampleListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *exampleService) DeleteExample(ctx context.Context, input *ExampleIDInput) (*struct{}, error) {
	id, err := parseExampleID(input.ID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeleteExample(ctx, id); err != nil {
		return nil, errs.HumaError(fmt.Errorf("delete example: %w", err))
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
