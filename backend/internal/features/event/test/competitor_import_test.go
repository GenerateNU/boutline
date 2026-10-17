package test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"boutline/internal/features/event"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const exampleImportCSV = `Last Name,First Name,Member #,Club,Division,Country,Birth Date,Gender,Rating,Event
Alvarez,Maria,100234501,Boston Fencing Club,New England,USA,2011-03-14,F,C24,Y14 Women's Foil
Chen,Lily,100234502,Boston Fencing Club,New England,USA,2012-07-02,F,U,Y14 Women's Foil
O'Brien,Kate,100234503,Cambridge Fencing Academy,New England,USA,03/22/2011,F,D2023,Y14 Women's Foil
"  Nguyen "," An ",,,New England,USA,2011-09-05,F,E25,Y14 Women's Foil
Patel,Riya,100234505,Cambridge Fencing Academy,New England,USA,2012-01-18,F,X24,Y14 Women's Foil
,,,Boston Fencing Club,New England,USA,,F,U,Y14 Women's Foil
Alvarez,Maria,100234501,Boston Fencing Club,New England,USA,2011-03-14,F,C24,Y14 Women's Foil
Smith,Jordan,100234510,Cambridge Fencing Academy,New England,USA,2005-11-30,M,B25,Div II Men's Epee
,,,,,,,,,
`

func postImport(t *testing.T, api humatest.TestAPI, eventID, filename, content string) *httptest.ResponseRecorder {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	if filename != "" {
		part, err := writer.CreateFormFile("file", filename)
		require.NoError(t, err)
		_, err = part.Write([]byte(content))
		require.NoError(t, err)
	}
	require.NoError(t, writer.Close())
	return api.Post("/api/v1/events/"+eventID+"/competitors/import", "Content-Type: "+writer.FormDataContentType(), body)
}

func previewImport(t *testing.T, content string) event.CompetitorImportBody {
	t.Helper()
	stored := seededEvent(event.EventStatusUpcoming, uuid.New())
	resp := postImport(t, newTestAPI(t, NewFakeTournamentLookup(), stored), stored.ID.String(), "r.csv", content)
	require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
	var preview event.CompetitorImportBody
	require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &preview))
	return preview
}

func TestPreviewCompetitorImportExampleFile(t *testing.T) {
	t.Parallel()
	preview := previewImport(t, exampleImportCSV)
	assert.Empty(t, preview.UnknownColumns)

	tests := []struct {
		name        string
		line        int
		status      string
		duplicateOf int
		errContains string
		check       func(t *testing.T, c event.ImportedCompetitor)
	}{
		{name: "valid with 2-digit rating year", line: 2, status: "valid", check: func(t *testing.T, c event.ImportedCompetitor) {
			assert.Equal(t, []any{"C", 2024, "100234501"}, []any{c.Rating, c.RatingYear, c.MemberNumber})
		}},
		{name: "unrated", line: 3, status: "valid", check: func(t *testing.T, c event.ImportedCompetitor) {
			assert.Equal(t, "U", c.Rating)
		}},
		{name: "US date and 4-digit rating year", line: 4, status: "valid", check: func(t *testing.T, c event.ImportedCompetitor) {
			assert.Equal(t, []any{"2011-03-22", "D", 2023}, []any{c.Birthdate, c.Rating, c.RatingYear})
		}},
		{name: "trimmed, no member number, unattached", line: 5, status: "valid", check: func(t *testing.T, c event.ImportedCompetitor) {
			assert.Equal(t, []string{"An", "Nguyen", "", ""}, []string{c.FirstName, c.LastName, c.MemberNumber, c.Club})
		}},
		{name: "invalid rating", line: 6, status: "invalid", errContains: `"X24"`},
		{name: "no name and no member number", line: 7, status: "invalid", errContains: "name"},
		{name: "duplicate member number", line: 8, status: "duplicate", duplicateOf: 2},
		{name: "different event", line: 9, status: "valid", check: func(t *testing.T, c event.ImportedCompetitor) {
			assert.Equal(t, "Div II Men's Epee", c.Event)
		}},
	}

	require.Len(t, preview.Rows, len(tests), "blank line 10 should be skipped")
	for i, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			row := preview.Rows[i]
			assert.Equal(t, tt.line, row.Line)
			assert.Equal(t, tt.status, row.Status)
			assert.Equal(t, tt.duplicateOf, row.DuplicateOf)
			if tt.errContains == "" {
				assert.Empty(t, row.Errors)
			} else {
				assert.Contains(t, strings.Join(row.Errors, "; "), tt.errContains)
			}
			if tt.check != nil {
				tt.check(t, row.Competitor)
			}
		})
	}
}

func TestPreviewCompetitorImportWritesNothing(t *testing.T) {
	t.Parallel()
	stored := seededEvent(event.EventStatusUpcoming, uuid.New())
	repo := NewFakeEventRepository(stored)
	_, api := humatest.New(t)
	event.RegisterEventService(api, event.NewEventService(repo, NewFakeTournamentLookup()))

	resp := postImport(t, api, stored.ID.String(), "r.csv", exampleImportCSV)
	require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
	assert.Equal(t, map[uuid.UUID]event.Event{stored.ID: stored}, repo.Events)
}

func TestPreviewCompetitorImportRows(t *testing.T) {
	t.Parallel()
	const header = "First Name,Last Name,Member #,Rating,Birth Date\n"

	tests := []struct {
		name        string
		file        string
		wantLines   []int
		wantStatus  []string
		wantUnknown []string
		errContains string
	}{
		{name: "header case and punctuation ignored", file: "FIRST NAME, last_name ,member-number\nLee,Kiefer,1\n", wantLines: []int{2}, wantStatus: []string{"valid"}},
		{name: "unknown columns listed", file: "First Name,Last Name,Team Color\nLee,Kiefer,red\n", wantLines: []int{2}, wantStatus: []string{"valid"}, wantUnknown: []string{"Team Color"}},
		{name: "byte-order mark stripped", file: "\xef\xbb\xbfFirst Name,Last Name\nLee,Kiefer\n", wantLines: []int{2}, wantStatus: []string{"valid"}},
		{name: "lowercase rating without year", file: header + "Lee,Kiefer,1,c,\n", wantLines: []int{2}, wantStatus: []string{"valid"}},
		{name: "U with a year", file: header + "Lee,Kiefer,1,U24,\n", wantLines: []int{2}, wantStatus: []string{"invalid"}, errContains: "rating"},
		{name: "3-digit rating year", file: header + "Lee,Kiefer,1,C123,\n", wantLines: []int{2}, wantStatus: []string{"invalid"}, errContains: "rating"},
		{name: "impossible date", file: header + "Lee,Kiefer,1,U,2011-13-01\n", wantLines: []int{2}, wantStatus: []string{"invalid"}, errContains: "birthdate"},
		{name: "member number alone is enough", file: header + ",,1,U,\n", wantLines: []int{2}, wantStatus: []string{"valid"}},
		{name: "short row", file: header + "Lee,Kiefer\n", wantLines: []int{2}, wantStatus: []string{"valid"}},
		{
			name:        "malformed row does not stop the file; lines count blank and quoted newlines",
			file:        "First Name,Last Name\nLee,\"Kie\"fer\n\n\"Multi\nLine\",Kiefer\nAlex,Massialas\n",
			wantLines:   []int{2, 4, 6},
			wantStatus:  []string{"invalid", "valid", "valid"},
			errContains: "malformed CSV",
		},
		{name: "header only", file: "First Name,Last Name\n", wantLines: []int{}, wantStatus: []string{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			preview := previewImport(t, tt.file)
			lines, statuses, errors := []int{}, []string{}, []string{}
			for _, row := range preview.Rows {
				lines = append(lines, row.Line)
				statuses = append(statuses, row.Status)
				errors = append(errors, row.Errors...)
			}
			assert.Equal(t, tt.wantLines, lines)
			assert.Equal(t, tt.wantStatus, statuses)
			if tt.wantUnknown == nil {
				tt.wantUnknown = []string{}
			}
			assert.Equal(t, tt.wantUnknown, preview.UnknownColumns)
			if tt.errContains == "" {
				assert.Empty(t, errors)
			} else {
				assert.Contains(t, strings.Join(errors, "; "), tt.errContains)
			}
		})
	}
}

func TestPreviewCompetitorImportRejects(t *testing.T) {
	t.Parallel()
	stored := seededEvent(event.EventStatusUpcoming, uuid.New())
	tooManyRows := "First Name,Last Name\n" + strings.Repeat("A,B\n", event.CompetitorImportMaxRows+1)

	tests := []struct {
		name       string
		eventID    string
		filename   string
		content    string
		wantStatus int
	}{
		{name: "unknown event", eventID: uuid.NewString(), filename: "r.csv", content: exampleImportCSV, wantStatus: http.StatusNotFound},
		{name: "not a .csv", filename: "r.xlsx", content: exampleImportCSV, wantStatus: http.StatusBadRequest},
		{name: "binary content", filename: "r.csv", content: "PK\x03\x04\xff", wantStatus: http.StatusBadRequest},
		{name: "empty file", filename: "r.csv", wantStatus: http.StatusBadRequest},
		{name: "no recognized headers", filename: "r.csv", content: "foo,bar\n1,2\n", wantStatus: http.StatusBadRequest},
		{name: "too many rows", filename: "r.csv", content: tooManyRows, wantStatus: http.StatusBadRequest},
		{name: "too large", filename: "r.csv", content: strings.Repeat("a", event.CompetitorImportMaxBytes+1), wantStatus: http.StatusBadRequest},
		{name: "no file", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			eventID := tt.eventID
			if eventID == "" {
				eventID = stored.ID.String()
			}
			resp := postImport(t, newTestAPI(t, NewFakeTournamentLookup(), stored), eventID, tt.filename, tt.content)
			assert.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}
