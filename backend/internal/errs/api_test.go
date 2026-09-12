package errs_test

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"boutline/internal/errs"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type payload struct {
	Email string `validate:"required,email"`
}

func TestErrorHandler(t *testing.T) {
	t.Parallel()

	validationErr := validator.New().Struct(payload{Email: "not-an-email"})
	require.Error(t, validationErr)

	tests := []struct {
		name        string
		err         error
		wantStatus  int
		wantMessage any
	}{
		{
			name:        "not found maps to 404 without the wrapped chain",
			err:         fmt.Errorf("load user: %w", errs.ErrNotFound),
			wantStatus:  http.StatusNotFound,
			wantMessage: "not found",
		},
		{
			name: "a chain built across layers is not leaked",
			err: fmt.Errorf("create example: %w",
				fmt.Errorf("insert example: %w", errs.ErrDuplicate)),
			wantStatus:  http.StatusConflict,
			wantMessage: "already exists",
		},
		{
			name: "a public message reaches the client",
			err: fmt.Errorf("create example: %w",
				errs.Public(`an example named "taken" already exists`, errs.ErrDuplicate)),
			wantStatus:  http.StatusConflict,
			wantMessage: `an example named "taken" already exists`,
		},
		{
			name:        "duplicate maps to 409",
			err:         errs.ErrDuplicate,
			wantStatus:  http.StatusConflict,
			wantMessage: "already exists",
		},
		{
			name:        "invalid input maps to 400",
			err:         errs.ErrInvalidInput,
			wantStatus:  http.StatusBadRequest,
			wantMessage: "invalid input",
		},
		{
			name:        "an explicit APIError is passed through",
			err:         errs.InvalidJSON(),
			wantStatus:  http.StatusBadRequest,
			wantMessage: "invalid JSON request data",
		},
		{
			name:        "a fiber error keeps its own status",
			err:         fiber.ErrTeapot,
			wantStatus:  http.StatusTeapot,
			wantMessage: fiber.ErrTeapot.Message,
		},
		{
			name:        "an unrecognised error is not leaked to the client",
			err:         errors.New("pq: password authentication failed for user \"admin\""),
			wantStatus:  http.StatusInternalServerError,
			wantMessage: "internal server error",
		},
		{
			name:       "validation failures map to 422 with per-field detail",
			err:        validationErr,
			wantStatus: http.StatusUnprocessableEntity,
			wantMessage: []any{
				map[string]any{"field": "Email", "message": "Email must be a valid email"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			app := fiber.New(fiber.Config{ErrorHandler: errs.ErrorHandler})
			app.Get("/", func(*fiber.Ctx) error { return tt.err })

			resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/", nil))
			require.NoError(t, err)
			defer func() { _ = resp.Body.Close() }()

			raw, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			var body struct {
				StatusCode int `json:"statusCode"`
				Message    any `json:"message"`
			}
			require.NoError(t, json.Unmarshal(raw, &body))

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			assert.Equal(t, tt.wantStatus, body.StatusCode)
			assert.Equal(t, tt.wantMessage, body.Message)
		})
	}
}
