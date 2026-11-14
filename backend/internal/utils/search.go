package utils

import (
	"strings"
	"unicode/utf8"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// A single character has too few trigrams to score meaningfully against
// word_similarity_threshold, so %> matches nothing. Below that length, the
// trigram functions fall back to a plain prefix match instead.
const trigramMinLength = 2

// To trigram match on cols (e.g. first and last name) we just concatenate with a space between
func TrigramExpr(columns []string) string {
	return strings.Join(columns, " || ' ' || ")
}

// Applies a trigram matching WHERE clause to a query (see TrigramPredicate).
// An empty term leaves query unfiltered, so a search with no term but a
// filter (e.g. tournament_id) still returns every row the filter matches,
// rather than nothing.
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

// Returns the WHERE clause for a trigram predicate: rows where term matches
// some continuous extent of the columns (joined by TrigramExpr) under
// pg_trgm's word_similarity_threshold, so the GIN trigram indexes are used.
// This is a prefix/substring-friendly match rather than a whole-string one: a
// short, partially typed term scores against the best-matching part of the
// text, not the full thing. %> takes the indexed expression on the left
// (matching the operator's indexable strategy) and term on the right,
// equivalent to word_similarity(term, expr) > threshold. columns are trusted
// SQL from the caller; term is always bound as a parameter. The expression is
// parenthesized because %> binds tighter than ||, so an unparenthesized
// concatenation would only apply %> to its last column. A term shorter than
// trigramMinLength falls back to a prefix match on each column.
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

// Applies a trigram ORDER clause to the query: descending word similarity,
// breaking ties with tiebreaker so a page is stable. Apply it after Count: a
// count query cannot order by word_similarity().
//
// An empty term, or one too short for TrigramMatch to rank by similarity,
// orders by emptyOrder instead (e.g. "created_at DESC"). tiebreaker and
// emptyOrder are trusted SQL from the caller, not bound as parameters.
func TrigramOrder(query *gorm.DB, columns []string, term, emptyOrder, tiebreaker string) *gorm.DB {
	if utf8.RuneCountInString(term) < trigramMinLength {
		return query.Order(emptyOrder + ", " + tiebreaker)
	}
	return query.Clauses(clause.OrderBy{Expression: clause.Expr{
		SQL:  "word_similarity(?, " + TrigramExpr(columns) + ") DESC, " + tiebreaker,
		Vars: []any{term},
	}})
}

// Escapes term's LIKE metacharacters so it matches literally inside an ILIKE
// pattern; callers add the % wildcards.
func likeEscaped(term string) string {
	return strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(term)
}
