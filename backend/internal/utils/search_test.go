package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTrigramPredicate(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		expr     string
		term     string
		wantSQL  string
		wantArgs []any
	}{
		{
			name:     "empty term returns no predicate",
			expr:     "team",
			term:     "",
			wantSQL:  "",
			wantArgs: nil,
		},
		{
			name:     "term at or above the minimum length uses word similarity",
			expr:     "team",
			term:     "bos",
			wantSQL:  "(team) %> ?",
			wantArgs: []any{"bos"},
		},
		{
			name:     "term below the minimum length falls back to a prefix match",
			expr:     "team",
			term:     "b",
			wantSQL:  "(team) ILIKE ?",
			wantArgs: []any{"b%"},
		},
		{
			name:     "short term escapes a backslash before appending the wildcard",
			expr:     "team",
			term:     `\`,
			wantSQL:  "(team) ILIKE ?",
			wantArgs: []any{`\\%`},
		},
		{
			name:     "short term escapes a percent before appending the wildcard",
			expr:     "team",
			term:     `%`,
			wantSQL:  "(team) ILIKE ?",
			wantArgs: []any{`\%%`},
		},
		{
			name:     "short term escapes an underscore before appending the wildcard",
			expr:     "team",
			term:     `_`,
			wantSQL:  "(team) ILIKE ?",
			wantArgs: []any{`\_%`},
		},
		{
			name:     "concatenation expr is parenthesized",
			expr:     "first_name || ' ' || last_name",
			term:     "bos",
			wantSQL:  "(first_name || ' ' || last_name) %> ?",
			wantArgs: []any{"bos"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gotSQL, gotArgs := TrigramPredicate(tt.expr, tt.term)

			assert.Equal(t, tt.wantSQL, gotSQL)
			assert.Equal(t, tt.wantArgs, gotArgs)
		})
	}
}
