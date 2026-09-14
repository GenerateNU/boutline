package test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/features/example"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seeded(name string, status example.ExampleStatus) example.Example {
	return example.Example{ID: uuid.New(), Name: name, Status: status}
}

// The service returns Huma errors now that Huma registers it directly, so a
// failure is asserted by the status and detail a client would receive.
func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func createInput(name string, status example.ExampleStatus) *example.ExampleCreateInput {
	return &example.ExampleCreateInput{
		Body: example.ExampleCreateBody{Name: name, Status: status},
	}
}

func TestCreateExample(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		seed       []example.Example
		input      *example.ExampleCreateInput
		wantName   string
		wantStatus example.ExampleStatus
		wantCode   int
		wantDetail string
	}{
		{
			name:       "trims the name and defaults the status",
			input:      createInput("  spaced out  ", ""),
			wantName:   "spaced out",
			wantStatus: example.ExampleStatusActive,
		},
		{
			name:       "keeps an explicit status",
			input:      createInput("archived one", example.ExampleStatusArchived),
			wantName:   "archived one",
			wantStatus: example.ExampleStatusArchived,
		},
		{
			// Huma's minLength rejects this over HTTP; the check still has to
			// exist for a caller that does not come through a request.
			name:       "rejects a name that is only whitespace",
			input:      createInput("   ", ""),
			wantCode:   http.StatusBadRequest,
			wantDetail: "name must not be blank",
		},
		{
			name:       "rejects an unknown status",
			input:      createInput("fine", example.ExampleStatus("nope")),
			wantCode:   http.StatusBadRequest,
			wantDetail: `unknown status "nope"`,
		},
		{
			name:       "reports a duplicate name, comparing the trimmed value",
			seed:       []example.Example{seeded("taken", example.ExampleStatusActive)},
			input:      createInput("  taken  ", ""),
			wantCode:   http.StatusConflict,
			wantDetail: `an example named "taken" already exists`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeExampleRepository(tt.seed...)
			out, err := example.NewExampleService(repo).CreateExample(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				assert.Len(t, repo.Examples, len(tt.seed))
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantName, out.Body.Name)
			assert.Equal(t, tt.wantStatus, out.Body.Status)
			assert.NotEmpty(t, out.Body.ID)
			assert.Len(t, repo.Examples, len(tt.seed)+1)
		})
	}
}

func TestGetExampleByID(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", example.ExampleStatusActive)
	service := example.NewExampleService(NewFakeExampleRepository(stored))

	t.Run("returns the stored example", func(t *testing.T) {
		t.Parallel()

		out, err := service.GetExampleByID(t.Context(), &example.ExampleIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Equal(t, stored.ID.String(), out.Body.ID)
		assert.Equal(t, stored.Name, out.Body.Name)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := service.GetExampleByID(t.Context(), &example.ExampleIDInput{ID: uuid.New().String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
		assert.Equal(t, "not found", detail)
	})

	t.Run("rejects an id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		// Huma's format:"uuid" catches this first over HTTP, with a 422.
		_, err := service.GetExampleByID(t.Context(), &example.ExampleIDInput{ID: "not-a-uuid"})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
}

func TestListExamples(t *testing.T) {
	t.Parallel()

	mixed := []example.Example{
		seeded("a active", example.ExampleStatusActive),
		seeded("b archived", example.ExampleStatusArchived),
		seeded("c active", example.ExampleStatusActive),
	}

	oversized := make([]example.Example, 0, example.ExampleMaxPageSize+1)
	for i := range example.ExampleMaxPageSize + 1 {
		oversized = append(oversized, seeded(fmt.Sprintf("example %03d", i), example.ExampleStatusActive))
	}

	tests := []struct {
		name       string
		seed       []example.Example
		input      *example.ExampleListInput
		wantNames  []string
		wantCount  int
		wantTotal  int64
		wantLimit  int
		wantOffset int
		wantCode   int
	}{
		{
			name:      "defaults to the first page",
			seed:      mixed,
			input:     &example.ExampleListInput{},
			wantNames: []string{"a active", "b archived", "c active"},
			wantTotal: 3,
			wantLimit: example.ExampleDefaultPageSize,
		},
		{
			name:      "filters by status and totals only the matches",
			seed:      mixed,
			input:     &example.ExampleListInput{Status: example.ExampleStatusActive},
			wantNames: []string{"a active", "c active"},
			wantTotal: 2,
			wantLimit: example.ExampleDefaultPageSize,
		},
		{
			name:       "applies limit and offset",
			seed:       mixed,
			input:      &example.ExampleListInput{Limit: 2, Offset: 1},
			wantNames:  []string{"b archived", "c active"},
			wantTotal:  3,
			wantLimit:  2,
			wantOffset: 1,
		},
		{
			name:      "clamps a limit above the maximum and reports the clamped value",
			seed:      oversized,
			input:     &example.ExampleListInput{Limit: 500},
			wantCount: example.ExampleMaxPageSize,
			wantTotal: int64(example.ExampleMaxPageSize + 1),
			wantLimit: example.ExampleMaxPageSize,
		},
		{
			name:      "clamps a page size of zero to the default",
			seed:      oversized,
			input:     &example.ExampleListInput{},
			wantCount: example.ExampleDefaultPageSize,
			wantTotal: int64(example.ExampleMaxPageSize + 1),
			wantLimit: example.ExampleDefaultPageSize,
		},
		{
			name:      "treats a negative offset as the first page",
			seed:      mixed,
			input:     &example.ExampleListInput{Offset: -5},
			wantNames: []string{"a active", "b archived", "c active"},
			wantTotal: 3,
			wantLimit: example.ExampleDefaultPageSize,
		},
		{
			name:     "rejects an unknown status",
			seed:     mixed,
			input:    &example.ExampleListInput{Status: example.ExampleStatus("nope")},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := example.NewExampleService(NewFakeExampleRepository(tt.seed...)).
				ListExamples(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Nil(t, out)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
			assert.Equal(t, tt.wantOffset, out.Body.Offset)

			if tt.wantNames != nil {
				names := make([]string, 0, len(out.Body.Data))
				for _, listed := range out.Body.Data {
					names = append(names, listed.Name)
				}
				assert.Equal(t, tt.wantNames, names)
				return
			}

			assert.Len(t, out.Body.Data, tt.wantCount)
		})
	}
}

func TestDeleteExample(t *testing.T) {
	t.Parallel()

	t.Run("removes the stored example", func(t *testing.T) {
		t.Parallel()

		stored := seeded("doomed", example.ExampleStatusActive)
		repo := NewFakeExampleRepository(stored)

		_, err := example.NewExampleService(repo).
			DeleteExample(t.Context(), &example.ExampleIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Empty(t, repo.Examples)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := example.NewExampleService(NewFakeExampleRepository()).
			DeleteExample(t.Context(), &example.ExampleIDInput{ID: uuid.New().String()})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

// A repository failure is nobody's fault but ours, so it becomes a 500 with a
// generic message rather than leaking the driver error.
func TestRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeExampleRepository()
	repo.Err = errors.New("connection refused")

	_, err := example.NewExampleService(repo).ListExamples(t.Context(), &example.ExampleListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}

func updateInput(id string, name *string, status *example.ExampleStatus) *example.ExampleUpdateInput {
	return &example.ExampleUpdateInput{
		ID:   id,
		Body: example.ExampleUpdateBody{Name: name, Status: status},
	}
}

func ptr[T any](v T) *T { return &v }

func TestUpdateExampleByID(t *testing.T) {
	t.Parallel()

	stored := seeded("before", example.ExampleStatusActive)
	other := seeded("taken", example.ExampleStatusActive)

	tests := []struct {
		name       string
		seed       []example.Example
		input      *example.ExampleUpdateInput
		wantName   string
		wantStatus example.ExampleStatus
		wantCode   int
		wantDetail string
	}{
		{
			name:       "renames without touching the status",
			seed:       []example.Example{stored},
			input:      updateInput(stored.ID.String(), ptr("after"), nil),
			wantName:   "after",
			wantStatus: example.ExampleStatusActive,
		},
		{
			name:       "changes the status without touching the name",
			seed:       []example.Example{stored},
			input:      updateInput(stored.ID.String(), nil, ptr(example.ExampleStatusArchived)),
			wantName:   "before",
			wantStatus: example.ExampleStatusArchived,
		},
		{
			name:       "trims the new name",
			seed:       []example.Example{stored},
			input:      updateInput(stored.ID.String(), ptr("  padded  "), nil),
			wantName:   "padded",
			wantStatus: example.ExampleStatusActive,
		},
		{
			name:       "refuses a patch that would change nothing",
			seed:       []example.Example{stored},
			input:      updateInput(stored.ID.String(), nil, nil),
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide at least one field to update",
		},
		{
			name:       "rejects a name that is only whitespace",
			seed:       []example.Example{stored},
			input:      updateInput(stored.ID.String(), ptr("   "), nil),
			wantCode:   http.StatusBadRequest,
			wantDetail: "name must not be blank",
		},
		{
			name:       "rejects an unknown status",
			seed:       []example.Example{stored},
			input:      updateInput(stored.ID.String(), nil, ptr(example.ExampleStatus("nope"))),
			wantCode:   http.StatusBadRequest,
			wantDetail: `unknown status "nope"`,
		},
		{
			name:       "reports a name already used by another row",
			seed:       []example.Example{stored, other},
			input:      updateInput(stored.ID.String(), ptr("taken"), nil),
			wantCode:   http.StatusConflict,
			wantDetail: `an example named "taken" already exists`,
		},
		{
			name:     "reports an unknown id as not found",
			input:    updateInput(uuid.New().String(), ptr("after"), nil),
			wantCode: http.StatusNotFound,
		},
		{
			name:     "rejects an id that is not a uuid",
			seed:     []example.Example{stored},
			input:    updateInput("not-a-uuid", ptr("after"), nil),
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeExampleRepository(tt.seed...)
			out, err := example.NewExampleService(repo).UpdateExampleByID(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantName, out.Body.Name)
			assert.Equal(t, tt.wantStatus, out.Body.Status)

			// The response is a read of what is stored, not an echo of the patch.
			assert.Equal(t, tt.wantName, repo.Examples[stored.ID].Name)
			assert.Equal(t, tt.wantStatus, repo.Examples[stored.ID].Status)
		})
	}
}
