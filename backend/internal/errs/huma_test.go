package errs_test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/errs"

	"github.com/danielgtaylor/huma/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHumaError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantDetail string
	}{
		{
			name:       "not found maps to 404 without the wrapped chain",
			err:        fmt.Errorf("find example: %w", fmt.Errorf("select example: %w", errs.ErrNotFound)),
			wantStatus: http.StatusNotFound,
			wantDetail: "not found",
		},
		{
			name:       "duplicate maps to 409",
			err:        fmt.Errorf("create example: %w", errs.ErrDuplicate),
			wantStatus: http.StatusConflict,
			wantDetail: "already exists",
		},
		{
			name:       "invalid input maps to 400",
			err:        fmt.Errorf("create example: %w", errs.ErrInvalidInput),
			wantStatus: http.StatusBadRequest,
			wantDetail: "invalid input",
		},
		{
			name: "a public message reaches the client",
			err: fmt.Errorf("create example: %w",
				errs.Public("name must not be blank", errs.ErrInvalidInput)),
			wantStatus: http.StatusBadRequest,
			wantDetail: "name must not be blank",
		},
		{
			name:       "an unrecognised error is not leaked to the client",
			err:        errors.New(`pq: password authentication failed for user "admin"`),
			wantStatus: http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			var model *huma.ErrorModel
			require.ErrorAs(t, errs.HumaError(tt.err), &model)

			assert.Equal(t, tt.wantStatus, model.Status)
			assert.Equal(t, tt.wantDetail, model.Detail)
		})
	}
}
