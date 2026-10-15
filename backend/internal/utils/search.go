package utils

import (
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// TrigramMatch narrows query to rows where term matches some continuous
// extent of expr under pg_trgm's word_similarity_threshold, so the GIN
// trigram indexes are used. This is a prefix/substring-friendly match rather
// than a whole-string one: a short, partially typed term scores against the
// best-matching part of expr, not the full thing. %> takes the indexed
// expression on the left (matching the operator's indexable strategy) and
// term on the right, equivalent to word_similarity(term, expr) > threshold.
// expr is trusted SQL from the caller (a column or a concatenation); term is
// always bound as a parameter. expr is parenthesized because %> binds tighter
// than ||, so an unparenthesized concatenation expr would only apply %> to
// its last operand and fail the boolean WHERE clause.
//
// An empty term leaves query unfiltered, so a search with no term but a
// filter (e.g. tournament_id) still returns every row the filter matches,
// rather than nothing.
func TrigramMatch(query *gorm.DB, expr, term string) *gorm.DB {
	if term == "" {
		return query
	}
	return query.Where("("+expr+") %> ?", term)
}

// TrigramOrder sorts by descending word similarity, breaking ties with
// tiebreaker so a page is stable. Apply it after Count: a count query cannot
// order by word_similarity().
//
// An empty term has no similarity to rank by, so it orders by emptyOrder
// instead (e.g. "created_at DESC"). tiebreaker and emptyOrder are trusted SQL
// from the caller, not bound as parameters.
func TrigramOrder(query *gorm.DB, expr, term, emptyOrder, tiebreaker string) *gorm.DB {
	if term == "" {
		return query.Order(emptyOrder)
	}
	return query.Clauses(clause.OrderBy{Expression: clause.Expr{
		SQL:  "word_similarity(?, " + expr + ") DESC, " + tiebreaker,
		Vars: []any{term},
	}})
}
