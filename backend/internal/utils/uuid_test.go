package utils

import (
	"net/http"
	"testing"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseUUIDList(t *testing.T) {
	t.Parallel()

	idA := "11111111-1111-1111-1111-111111111111"
	idB := "22222222-2222-2222-2222-222222222222"

	tests := []struct {
		name    string
		raw     string
		want    []uuid.UUID
		wantErr bool
	}{
		{
			name: "empty string",
			raw:  "",
			want: nil,
		},
		{
			name: "only commas",
			raw:  ",,,",
			want: nil,
		},
		{
			name: "whitespace-padded single id",
			raw:  "  " + idA + "  ",
			want: []uuid.UUID{uuid.MustParse(idA)},
		},
		{
			name: "several valid ids in order",
			raw:  idA + "," + idB,
			want: []uuid.UUID{uuid.MustParse(idA), uuid.MustParse(idB)},
		},
		{
			name: "duplicate ids pass through unchanged",
			raw:  idA + "," + idA,
			want: []uuid.UUID{uuid.MustParse(idA), uuid.MustParse(idA)},
		},
		{
			name:    "one invalid element among valid ones",
			raw:     idA + ",not-a-uuid," + idB,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := ParseUUIDList(tt.raw, "ids")

			if tt.wantErr {
				require.Error(t, err)
				assert.Equal(t, http.StatusBadRequest, errs.StatusFor(err))
				assert.Equal(t, "ids must be a valid uuid", errs.ClientMessage(err))
				assert.Nil(t, got)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}
