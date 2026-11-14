package utils

import (
	"strings"
	"unicode/utf8"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// A single character has too few trigrams to score meaningfully against
// word_similarity_threshold, so %> matches nothing. Below that length, both
// functions fall back to a plain prefix match instead.
const trigramMinLength = 2

// TrigramExpr concatenates columns the way the GIN trigram index on them
// expects, so callers that build their own SQL (an ORDER BY with a MAX()
// aggregate, say) stay index-compatible with TrigramMatch and TrigramOrder.
// The separator must match backend/migrations/20261014020658_enable_fuzzy_search.sql
// exactly.
func TrigramExpr(columns []string) string {
	return strings.Join(columns, " || ' ' || ")
}

// TrigramMatch narrows query to rows where term matches some continuous
// extent of columns under pg_trgm's word_similarity_threshold, so the GIN
// trigram indexes are used.
//
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

// TrigramPredicate returns the WHERE fragment and args TrigramMatch would
// apply, for callers that must embed it in SQL they build themselves. It
// returns "", nil for an empty term.
//
// This is a prefix/substring-friendly match rather than a whole-string one:
// a short, partially typed term scores against the best-matching part of the
// columns, not the full thing. Below trigramMinLength there are too few
// trigrams for %> to score meaningfully against word_similarity_threshold, so
// a short term falls back to a plain per-column ILIKE prefix match instead,
// one clause per column OR'd together: a column list is a list of fields,
// not a single string, so "starts with" has to mean "some column starts
// with," and anchoring to a concatenation instead would only ever match the
// first column. The OR list is parenthesized so it combines correctly with
// whatever the caller ANDs it against.
//
// At or above trigramMinLength, %> needs the concatenated columns rather
// than one at a time: scoring a multi-word term against a single column
// would compare it to only part of what the user typed and likely fall
// under the threshold. %> takes the indexed expression on the left (matching
// the operator's indexable strategy) and term on the right, equivalent to
// word_similarity(term, columns) > threshold. The concatenation is
// parenthesized because %> binds tighter than ||, so an unparenthesized
// concatenation would only apply %> to its last operand and fail the boolean
// WHERE clause; this is no longer reachable from call sites now that callers
// pass columns rather than a hand-written concatenation, but the hazard is
// why the parens stay. columns is trusted SQL from the caller; term is
// always bound as a parameter.
func TrigramPredicate(columns []string, term string) (string, []any) {
	if term == "" {
		return "", nil
	}
	if utf8.RuneCountInString(term) < trigramMinLength {
		return ilikeAny(columns, likeEscaped(term)+"%")
	}
	return "(" + TrigramExpr(columns) + ") %> ?", []any{term}
}

// SubstringMatch narrows query to rows where term appears somewhere in one of
// columns, case-insensitively. An empty term leaves query unfiltered, the same
// way TrigramMatch does.
func SubstringMatch(query *gorm.DB, columns []string, term string) *gorm.DB {
	fragment, args := SubstringPredicate(columns, term)
	if fragment == "" {
		return query
	}
	return query.Where(fragment, args...)
}

// SubstringPredicate returns the WHERE fragment and args SubstringMatch would
// apply, for callers that must embed it in SQL they build themselves. It
// returns "", nil for an empty term.
//
// This is the match for filtering by a value the user either typed part of or
// picked whole from a list, where word similarity is too loose to be correct.
// Club names share generic words, so word_similarity('Tokyo Fencing Club',
// 'Boston Fencing Club') is 0.68 and clears the default 0.6 threshold — a club
// filter built on %> returns competitors from entirely different clubs.
// Requiring containment instead keeps a partial "bos" matching Boston Fencing
// Club while still demanding the distinguishing part of the name be present.
//
// A leading wildcard is still indexable by a GIN trigram index once term is
// long enough to yield a trigram; below that Postgres scans and rechecks,
// which is what the short trigram path already does.
func SubstringPredicate(columns []string, term string) (string, []any) {
	if term == "" {
		return "", nil
	}
	return ilikeAny(columns, "%"+likeEscaped(term)+"%")
}

// ilikeAny matches pattern against any one of columns. The clauses are
// parenthesized so the OR list combines correctly with whatever the caller
// ANDs it against.
func ilikeAny(columns []string, pattern string) (string, []any) {
	clauses := make([]string, len(columns))
	args := make([]any, len(columns))
	for i, col := range columns {
		clauses[i] = col + " ILIKE ?"
		args[i] = pattern
	}
	return "(" + strings.Join(clauses, " OR ") + ")", args
}

// TrigramOrder sorts by descending word similarity, breaking ties with
// tiebreaker so a page is stable. Apply it after Count: a count query cannot
// order by word_similarity().
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

// likeEscaped escapes term's LIKE metacharacters so it matches literally,
// leaving the caller to add whichever wildcards it wants.
func likeEscaped(term string) string {
	return strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(term)
}
