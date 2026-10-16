package test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestTranslateWriteError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		foreignKeyMessage string
		err               error
		wantStatus        int
		wantMsg           string
	}{
		{
			name:       "duplicate key becomes a duplicate",
			err:        fmt.Errorf("%w: boom", gorm.ErrDuplicatedKey),
			wantStatus: http.StatusConflict,
			wantMsg:    errs.ErrDuplicate.Error(),
		},
		{
			name:              "foreign key violation uses the given message",
			foreignKeyMessage: "tournament_id does not reference an existing record",
			err:               fmt.Errorf("%w: boom", gorm.ErrForeignKeyViolated),
			wantStatus:        http.StatusBadRequest,
			wantMsg:           "tournament_id does not reference an existing record",
		},
		{
			name:       "foreign key violation without a message names the table",
			err:        fmt.Errorf("%w: boom", gorm.ErrForeignKeyViolated),
			wantStatus: http.StatusBadRequest,
			wantMsg:    "a bouts row references a record that does not exist",
		},
		{
			name:       "check constraint violation names the table",
			err:        fmt.Errorf("%w: boom", gorm.ErrCheckConstraintViolated),
			wantStatus: http.StatusBadRequest,
			wantMsg:    "bouts fields violate a constraint",
		},
		{
			name:       "unrelated error stays internal",
			err:        errors.New("connection refused"),
			wantStatus: http.StatusInternalServerError,
			wantMsg:    "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			err := utils.TranslateWriteError("create bout", "bouts", tt.foreignKeyMessage, tt.err)

			assert.Equal(t, tt.wantStatus, errs.StatusFor(err))
			assert.Equal(t, tt.wantMsg, errs.ClientMessage(err))
			assert.ErrorContains(t, err, "create bout: ")
		})
	}
}

func TestTranslateReadError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantMsg    string
	}{
		{
			name:       "missing record becomes not found",
			err:        fmt.Errorf("%w: boom", gorm.ErrRecordNotFound),
			wantStatus: http.StatusNotFound,
			wantMsg:    errs.ErrNotFound.Error(),
		},
		{
			name:       "unrelated error stays internal",
			err:        errors.New("connection refused"),
			wantStatus: http.StatusInternalServerError,
			wantMsg:    "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			err := utils.TranslateReadError("select bout", tt.err)

			assert.Equal(t, tt.wantStatus, errs.StatusFor(err))
			assert.Equal(t, tt.wantMsg, errs.ClientMessage(err))
			assert.ErrorContains(t, err, "select bout: ")
		})
	}
}

func TestTranslateDeleteError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantMsg    string
	}{
		{
			name:       "still-referenced row becomes a conflict",
			err:        fmt.Errorf("%w: boom", gorm.ErrForeignKeyViolated),
			wantStatus: http.StatusConflict,
			wantMsg:    "a bout with scoring cannot be deleted",
		},
		{
			name:       "unrelated error stays internal",
			err:        errors.New("connection refused"),
			wantStatus: http.StatusInternalServerError,
			wantMsg:    "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			err := utils.TranslateDeleteError("delete bout", "a bout with scoring cannot be deleted", tt.err)

			assert.Equal(t, tt.wantStatus, errs.StatusFor(err))
			assert.Equal(t, tt.wantMsg, errs.ClientMessage(err))
			assert.ErrorContains(t, err, "delete bout: ")
		})
	}
}
