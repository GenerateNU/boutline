package test

import (
	"errors"
	"fmt"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/features/example"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seeded(name string, status example.ExampleStatus) example.Example {
	return example.Example{ID: uuid.New(), Name: name, Status: status}
}

func TestCreateExample(t *testing.T) {
	t.Parallel()

	taken := seeded("taken", example.ExampleStatusActive)

	tests := []struct {
		name       string
		seed       []example.Example
		params     example.ExampleCreateParams
		wantName   string
		wantStatus example.ExampleStatus
		wantErr    error
	}{
		{
			name:       "trims the name and defaults the status",
			params:     example.ExampleCreateParams{Name: "  spaced out  "},
			wantName:   "spaced out",
			wantStatus: example.ExampleStatusActive,
		},
		{
			name:       "keeps an explicit status",
			params:     example.ExampleCreateParams{Name: "archived one", Status: example.ExampleStatusArchived},
			wantName:   "archived one",
			wantStatus: example.ExampleStatusArchived,
		},
		{
			name:    "rejects a name that is only whitespace",
			params:  example.ExampleCreateParams{Name: "   "},
			wantErr: errs.ErrInvalidInput,
		},
		{
			name:    "rejects an unknown status",
			params:  example.ExampleCreateParams{Name: "fine", Status: example.ExampleStatus("nope")},
			wantErr: errs.ErrInvalidInput,
		},
		{
			name:    "reports a duplicate name, comparing the trimmed value",
			seed:    []example.Example{taken},
			params:  example.ExampleCreateParams{Name: "  taken  "},
			wantErr: errs.ErrDuplicate,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeExampleRepository(tt.seed...)
			created, err := example.NewExampleService(repo).CreateExample(t.Context(), tt.params)

			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, created)
				assert.Len(t, repo.Examples, len(tt.seed))
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantName, created.Name)
			assert.Equal(t, tt.wantStatus, created.Status)
			assert.NotEqual(t, uuid.Nil, created.ID)
			assert.Equal(t, *created, repo.Examples[created.ID])
		})
	}
}

func TestFindExampleByID(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", example.ExampleStatusActive)
	service := example.NewExampleService(NewFakeExampleRepository(stored))

	t.Run("returns the stored example", func(t *testing.T) {
		t.Parallel()

		found, err := service.FindExampleByID(t.Context(), stored.ID)

		require.NoError(t, err)
		assert.Equal(t, stored, *found)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		found, err := service.FindExampleByID(t.Context(), uuid.New())

		assert.ErrorIs(t, err, errs.ErrNotFound)
		assert.Nil(t, found)
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
		name      string
		seed      []example.Example
		params    example.ExampleListParams
		wantNames []string
		wantCount int
		wantTotal int64
		wantErr   error
	}{
		{
			name:      "defaults to the first page",
			seed:      mixed,
			wantNames: []string{"a active", "b archived", "c active"},
			wantTotal: 3,
		},
		{
			name:      "filters by status and totals only the matches",
			seed:      mixed,
			params:    example.ExampleListParams{Status: example.ExampleStatusActive},
			wantNames: []string{"a active", "c active"},
			wantTotal: 2,
		},
		{
			name:      "applies limit and offset",
			seed:      mixed,
			params:    example.ExampleListParams{Limit: 2, Offset: 1},
			wantNames: []string{"b archived", "c active"},
			wantTotal: 3,
		},
		{
			name:      "clamps a limit above the maximum page size",
			seed:      oversized,
			params:    example.ExampleListParams{Limit: 500},
			wantCount: example.ExampleMaxPageSize,
			wantTotal: int64(example.ExampleMaxPageSize + 1),
		},
		{
			name:      "clamps a page size of zero to the default",
			seed:      oversized,
			wantCount: example.ExampleDefaultPageSize,
			wantTotal: int64(example.ExampleMaxPageSize + 1),
		},
		{
			name:      "treats a negative offset as the first page",
			seed:      mixed,
			params:    example.ExampleListParams{Offset: -5},
			wantNames: []string{"a active", "b archived", "c active"},
			wantTotal: 3,
		},
		{
			name:    "rejects an unknown status",
			seed:    mixed,
			params:  example.ExampleListParams{Status: example.ExampleStatus("nope")},
			wantErr: errs.ErrInvalidInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			page, err := example.NewExampleService(NewFakeExampleRepository(tt.seed...)).ListExamples(t.Context(), tt.params)

			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, page)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, page.Total)

			if tt.wantNames != nil {
				names := make([]string, 0, len(page.Examples))
				for _, listed := range page.Examples {
					names = append(names, listed.Name)
				}
				assert.Equal(t, tt.wantNames, names)
				return
			}

			assert.Len(t, page.Examples, tt.wantCount)
		})
	}
}

func TestDeleteExample(t *testing.T) {
	t.Parallel()

	t.Run("removes the stored example", func(t *testing.T) {
		t.Parallel()

		stored := seeded("doomed", example.ExampleStatusActive)
		repo := NewFakeExampleRepository(stored)

		require.NoError(t, example.NewExampleService(repo).DeleteExample(t.Context(), stored.ID))
		assert.Empty(t, repo.Examples)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		err := example.NewExampleService(NewFakeExampleRepository()).DeleteExample(t.Context(), uuid.New())

		assert.ErrorIs(t, err, errs.ErrNotFound)
	})
}

// A repository failure is not one of the sentinels, so it stays a 500 rather
// than leaking out as a client error.
func TestRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeExampleRepository()
	repo.Err = errors.New("connection refused")

	_, err := example.NewExampleService(repo).ListExamples(t.Context(), example.ExampleListParams{})

	require.Error(t, err)
	assert.NotErrorIs(t, err, errs.ErrNotFound)
	assert.NotErrorIs(t, err, errs.ErrInvalidInput)
	assert.NotErrorIs(t, err, errs.ErrDuplicate)
}
