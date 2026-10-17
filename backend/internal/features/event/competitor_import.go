package event

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"boutline/internal/errs"

	"github.com/danielgtaylor/huma/v2"
)

const (
	CompetitorImportMaxBytes = 2 << 20
	CompetitorImportMaxRows  = 5000
)

// Keyed by header with case, spacing, and punctuation stripped.
var importColumns = map[string]string{
	"firstname":    "first_name",
	"lastname":     "last_name",
	"member":       "member_number",
	"membernumber": "member_number",
	"club":         "club",
	"division":     "division",
	"country":      "country",
	"birthdate":    "birthdate",
	"gender":       "gender",
	"rating":       "rating",
	"event":        "event",
}

var importRatingPattern = regexp.MustCompile(`^([A-E])(\d{2}|\d{4})?$`)

func parseCompetitorImport(file huma.FormFile) (*CompetitorImportBody, error) {
	if !strings.EqualFold(filepath.Ext(file.Filename), ".csv") {
		return nil, errs.Public("upload must be a .csv file", errs.ErrInvalidInput)
	}
	if file.Size > CompetitorImportMaxBytes {
		return nil, errs.Public("file is larger than 2 MiB", errs.ErrInvalidInput)
	}
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("read upload: %w", err)
	}

	// Some editors prefix UTF-8 files with a byte-order mark.
	data = bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))
	if !utf8.Valid(data) {
		return nil, errs.Public("file is not a text CSV", errs.ErrInvalidInput)
	}

	reader := csv.NewReader(bytes.NewReader(data))
	reader.FieldsPerRecord = -1
	header, err := reader.Read()
	if err != nil {
		return nil, errs.Public("missing or malformed header row", errs.ErrInvalidInput)
	}

	columns := map[string]int{}
	unknown := []string{}
	for i, name := range header {
		name = strings.TrimSpace(name)
		if column, ok := importColumns[normalizeImportHeader(name)]; ok {
			columns[column] = i
		} else if name != "" {
			unknown = append(unknown, name)
		}
	}
	if len(columns) == 0 {
		return nil, errs.Public("header row has no recognized columns", errs.ErrInvalidInput)
	}

	rows, err := readImportRows(reader, columns)
	if err != nil {
		return nil, err
	}
	return &CompetitorImportBody{Rows: rows, UnknownColumns: unknown}, nil
}

func normalizeImportHeader(name string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return unicode.ToLower(r)
		}
		return -1
	}, name)
}

func readImportRows(reader *csv.Reader, columns map[string]int) ([]CompetitorImportRow, error) {
	rows := []CompetitorImportRow{}
	firstLineByMember := map[string]int{}
	for {
		if len(rows) > CompetitorImportMaxRows {
			return nil, errs.Public(
				fmt.Sprintf("file has more than %d rows", CompetitorImportMaxRows), errs.ErrInvalidInput)
		}
		record, err := reader.Read()
		if errors.Is(err, io.EOF) {
			return rows, nil
		}

		var parseErr *csv.ParseError
		switch {
		case errors.As(err, &parseErr):
			rows = append(rows, CompetitorImportRow{
				Line:   parseErr.StartLine,
				Status: "invalid",
				Errors: []string{"malformed CSV: " + parseErr.Err.Error()},
			})
		case err != nil:
			return nil, fmt.Errorf("read csv row: %w", err)
		case strings.TrimSpace(strings.Join(record, "")) != "":
			line, _ := reader.FieldPos(0)
			row := readImportRow(line, columns, record)
			if member := row.Competitor.MemberNumber; member != "" {
				if first, seen := firstLineByMember[member]; seen {
					row.DuplicateOf = first
				} else {
					firstLineByMember[member] = line
				}
			}
			if row.DuplicateOf != 0 && row.Status == "valid" {
				row.Status = "duplicate"
			}
			rows = append(rows, row)
		}
	}
}

func readImportRow(line int, columns map[string]int, record []string) CompetitorImportRow {
	value := func(column string) string {
		if i, ok := columns[column]; ok && i < len(record) {
			return strings.TrimSpace(record[i])
		}
		return ""
	}

	competitor := ImportedCompetitor{
		FirstName:    value("first_name"),
		LastName:     value("last_name"),
		MemberNumber: value("member_number"),
		Club:         value("club"),
		Division:     value("division"),
		Country:      value("country"),
		Gender:       value("gender"),
		Event:        value("event"),
	}
	row := CompetitorImportRow{Line: line, Status: "valid", Errors: []string{}}

	if competitor.MemberNumber == "" && (competitor.FirstName == "" || competitor.LastName == "") {
		row.Errors = append(row.Errors, "needs a first and last name, or a member number")
	}
	var err error
	if competitor.Rating, competitor.RatingYear, err = parseImportRating(value("rating")); err != nil {
		row.Errors = append(row.Errors, err.Error())
	}
	if competitor.Birthdate, err = parseImportBirthdate(value("birthdate")); err != nil {
		row.Errors = append(row.Errors, err.Error())
	}

	if len(row.Errors) > 0 {
		row.Status = "invalid"
	}
	row.Competitor = competitor
	return row
}

func parseImportRating(raw string) (string, int, error) {
	value := strings.ToUpper(raw)
	if value == "" || value == "U" {
		return "U", 0, nil
	}
	match := importRatingPattern.FindStringSubmatch(value)
	if match == nil {
		return "", 0, fmt.Errorf("invalid rating %q: must be A-E with an optional 2- or 4-digit year, or U", raw)
	}
	if match[2] == "" {
		return match[1], 0, nil
	}
	year, err := strconv.Atoi(match[2])
	if err != nil {
		return "", 0, fmt.Errorf("invalid rating year %q: %w", raw, err)
	}
	if year < 100 {
		year += 2000
	}
	return match[1], year, nil
}

func parseImportBirthdate(raw string) (string, error) {
	if raw == "" {
		return "", nil
	}
	for _, layout := range []string{time.DateOnly, "1/2/2006"} {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return parsed.Format(time.DateOnly), nil
		}
	}
	return "", fmt.Errorf("invalid birthdate %q: use YYYY-MM-DD or MM/DD/YYYY", raw)
}
