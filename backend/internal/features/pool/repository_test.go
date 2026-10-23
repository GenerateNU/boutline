package pool

import (
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/errs"

	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestTranslatePoolWriteError(t *testing.T) {
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
			wantMsg:    "referee_id does not reference an existing record",
		},
		{
			name:       "duplicate key becomes a conflict",
			err:        fmt.Errorf("insert: %w", gorm.ErrDuplicatedKey),
			wantStatus: http.StatusConflict,
			wantMsg:    "a pool with this number already exists in the pool stage",
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

			err := translatePoolWriteError("create pool", tt.err)

			assert.Equal(t, tt.wantStatus, errs.StatusFor(err))
			assert.Equal(t, tt.wantMsg, errs.ClientMessage(err))
		})
	}
}
