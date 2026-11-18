package poolresult

import "strings"

func filterPoolResults(rows []PoolResultRow, query string) []PoolResultRow {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return rows
	}

	matched := make([]PoolResultRow, 0, len(rows))
	for _, row := range rows {
		if matchesPoolResult(row.Fencer, query) {
			matched = append(matched, row)
		}
	}

	return matched
}

func matchesPoolResult(fencer PoolResultFencer, query string) bool {
	name := strings.ToLower(fencer.FirstName + " " + fencer.LastName)
	if strings.Contains(name, query) {
		return true
	}

	return fencer.Club != nil && strings.Contains(strings.ToLower(*fencer.Club), query)
}
