package utils

import (
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// TrigramMatch narrows query to rows whose expr is similar to term under
// pg_trgm's similarity_threshold, so the GIN trigram indexes are used.
// expr is trusted SQL from the caller (a column or a concatenation); term is
// always bound as a parameter. expr is parenthesized because % binds tighter
// than ||, so an unparenthesized concatenation expr would only apply % to its
// last operand and fail the boolean WHERE clause.
func TrigramMatch(query *gorm.DB, expr, term string) *gorm.DB {
	return query.Where("("+expr+") % ?", term)
}

// TrigramOrder sorts by descending similarity, with id as the tiebreaker so a
// page is stable. Apply it after Count: a count query cannot order by
// similarity().
func TrigramOrder(query *gorm.DB, expr, term string) *gorm.DB {
	return query.Clauses(clause.OrderBy{Expression: clause.Expr{
		SQL:  "similarity(" + expr + ", ?) DESC, id",
		Vars: []any{term},
	}})
}
