package utils

import (
	"strings"
	"unicode/utf8"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Single-char matches are too short for trigram, so we fall back to prefix matching
const trigramMinLength = 2

// To trigram match on cols (e.g. first and last name) we just concatenate with a space between
func TrigramExpr(columns []string) string {
	return strings.Join(columns, " || ' ' || ")
}

// Applies a trigram matching WHERE clause to a query
func TrigramMatch(query *gorm.DB, columns []string, term string) *gorm.DB {
	fragment, args := TrigramPredicate(columns, term)
	if fragment == "" {
		return query
	}
	return query.Where(fragment, args...)
}

// Applies a substring matching WHERE clause to a query
func SubstringMatch(query *gorm.DB, columns []string, term string) *gorm.DB {
	fragment, args := SubstringPredicate(columns, term)
	if fragment == "" {
		return query
	}
	return query.Where(fragment, args...)
}

// Returns the WHERE clause for a trigram predicate, falls back to prefix
// matching for short strings
func TrigramPredicate(columns []string, term string) (string, []any) {
	if term == "" {
		return "", nil
	}
	if utf8.RuneCountInString(term) < trigramMinLength {
		return ilikeAny(columns, likeEscaped(term)+"%")
	}
	return "(" + TrigramExpr(columns) + ") %> ?", []any{term}
}

// Returns the WHERE clause for a substring match predicate
func SubstringPredicate(columns []string, term string) (string, []any) {
	if term == "" {
		return "", nil
	}
	return ilikeAny(columns, "%"+likeEscaped(term)+"%")
}

// Returns the WHERE clause for a prefix match predicate
func PrefixPredicate(columns []string, term string) (string, []any) {
	if term == "" {
		return "", nil
	}
	return ilikeAny(columns, likeEscaped(term)+"%")
}

// Applies ILIKE across columns (e.g. first and last name)
func ilikeAny(columns []string, pattern string) (string, []any) {
	clauses := make([]string, len(columns))
	args := make([]any, len(columns))
	for i, col := range columns {
		clauses[i] = col + " ILIKE ?"
		args[i] = pattern
	}
	return "(" + strings.Join(clauses, " OR ") + ")", args
}

// Applies a trigram ORDER clause to the query. Accepts fallback conditions for both
// an empty search term, and to tiebreak equally-similar rows
func TrigramOrder(query *gorm.DB, columns []string, term, emptyOrder, tiebreaker string) *gorm.DB {
	if utf8.RuneCountInString(term) < trigramMinLength {
		return query.Order(emptyOrder + ", " + tiebreaker)
	}
	return query.Clauses(clause.OrderBy{Expression: clause.Expr{
		SQL:  "word_similarity(?, " + TrigramExpr(columns) + ") DESC, " + tiebreaker,
		Vars: []any{term},
	}})
}

// Escape for ILIKE
func likeEscaped(term string) string {
	return strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(term)
}
