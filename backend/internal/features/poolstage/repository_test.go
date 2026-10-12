package poolstage

import (
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/errs"

	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestTranslatePoolStageWriteError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantMsg    string
	}{
		{
			name:       "foreign key violation becomes an invalid input",
			err:        fmt.Errorf("%w: boom", gorm.ErrForeignKeyViolated),
			wantStatus: http.StatusBadRequest,
			wantMsg:    "event_id does not reference an existing record",
		},
		{
			name:       "check constraint violation becomes an invalid input",
			err:        fmt.Errorf("%w: boom", gorm.ErrCheckConstraintViolated),
			wantStatus: http.StatusBadRequest,
			wantMsg:    "pool stage fields violate a constraint",
		},
		{
			name:       "unrelated error stays internal",
			err:        fmt.Errorf("connection refused"),
			wantStatus: http.StatusInternalServerError,
			wantMsg:    "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			err := translatePoolStageWriteError("create pool stage", tt.err)

			assert.Equal(t, tt.wantStatus, errs.StatusFor(err))
			assert.Equal(t, tt.wantMsg, errs.ClientMessage(err))
		})
	}
}
