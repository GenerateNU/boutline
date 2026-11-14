package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTrigramPredicate(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		columns  []string
		term     string
		wantSQL  string
		wantArgs []any
	}{
		{
			name:     "empty term returns no predicate",
			columns:  []string{"team"},
			term:     "",
			wantSQL:  "",
			wantArgs: nil,
		},
		{
			name:     "term at or above the minimum length uses word similarity",
			columns:  []string{"team"},
			term:     "bos",
			wantSQL:  "(team) %> ?",
			wantArgs: []any{"bos"},
		},
		{
			name:     "term below the minimum length falls back to a prefix match",
			columns:  []string{"team"},
			term:     "b",
			wantSQL:  "(team ILIKE ?)",
			wantArgs: []any{"b%"},
		},
		{
			name:     "short term escapes a backslash before appending the wildcard",
			columns:  []string{"team"},
			term:     `\`,
			wantSQL:  "(team ILIKE ?)",
			wantArgs: []any{`\\%`},
		},
		{
			name:     "short term escapes a percent before appending the wildcard",
			columns:  []string{"team"},
			term:     `%`,
			wantSQL:  "(team ILIKE ?)",
			wantArgs: []any{`\%%`},
		},
		{
			name:     "short term escapes an underscore before appending the wildcard",
			columns:  []string{"team"},
			term:     `_`,
			wantSQL:  "(team ILIKE ?)",
			wantArgs: []any{`\_%`},
		},
		{
			name:     "concatenation is parenthesized for the long path",
			columns:  []string{"first_name", "last_name"},
			term:     "bos",
			wantSQL:  "(first_name || ' ' || last_name) %> ?",
			wantArgs: []any{"bos"},
		},
		{
			name:     "short term with two columns ORs a prefix match per column",
			columns:  []string{"first_name", "last_name"},
			term:     "c",
			wantSQL:  "(first_name ILIKE ? OR last_name ILIKE ?)",
			wantArgs: []any{"c%", "c%"},
		},
		{
			name:     "short term preserves table-qualified column names",
			columns:  []string{"competitors.first_name", "competitors.last_name"},
			term:     "c",
			wantSQL:  "(competitors.first_name ILIKE ? OR competitors.last_name ILIKE ?)",
			wantArgs: []any{"c%", "c%"},
		},
		{
			name:     "long multi-word term still uses the concatenation, not per-column matching",
			columns:  []string{"first_name", "last_name"},
			term:     "yan chen",
			wantSQL:  "(first_name || ' ' || last_name) %> ?",
			wantArgs: []any{"yan chen"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gotSQL, gotArgs := TrigramPredicate(tt.columns, tt.term)

			assert.Equal(t, tt.wantSQL, gotSQL)
			assert.Equal(t, tt.wantArgs, gotArgs)
		})
	}
}
