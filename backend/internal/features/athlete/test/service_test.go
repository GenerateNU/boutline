package test

import (
	"errors"
	"net/http"
	"testing"

	"boutline/internal/features/athlete"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func apiStatus(t *testing.T, err error) int {
	t.Helper()
	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)
	return model.Status
}

func TestGetAthleteByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		id         string
		repoErr    error
		wantStatus int
		wantName   string
	}{
		{name: "found", id: MayaID.String(), wantName: "Maya Chen"},
		{name: "unknown id", id: uuid.NewString(), wantStatus: http.StatusNotFound},
		{name: "malformed id", id: "nope", wantStatus: http.StatusBadRequest},
		{name: "repository failure", id: MayaID.String(), repoErr: errors.New("boom"), wantStatus: http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := NewFakeAthleteRepository()
			repo.Err = tt.repoErr
			out, err := athlete.NewAthleteService(repo).GetAthleteByID(t.Context(), &athlete.AthleteIDInput{ID: tt.id})
			if tt.wantStatus != 0 {
				assert.Equal(t, tt.wantStatus, apiStatus(t, err))
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantName, out.Body.FirstName+" "+out.Body.LastName)
			assert.True(t, out.Body.Claimed)
		})
	}
}

func TestListAthleteCompetitors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		id         string
		limit      int
		offset     int
		wantLimit  int
		wantOffset int
		wantLen    int
		wantTotal  int64
		wantStatus int
	}{
		{name: "entries", id: MayaID.String(), limit: 10, wantLimit: 10, wantLen: 1, wantTotal: 1},
		{name: "zero limit defaults", id: MayaID.String(), limit: 0, wantLimit: 20, wantLen: 1, wantTotal: 1},
		{name: "limit capped", id: MayaID.String(), limit: 500, wantLimit: 100, wantLen: 1, wantTotal: 1},
		{name: "negative offset floored", id: MayaID.String(), limit: 10, offset: -1, wantLimit: 10, wantLen: 1, wantTotal: 1},
		{name: "offset past the end", id: MayaID.String(), limit: 10, offset: 5, wantLimit: 10, wantOffset: 5, wantTotal: 1},
		{name: "unknown athlete is an empty page", id: uuid.NewString(), limit: 10, wantLimit: 10},
		{name: "malformed id", id: "nope", wantStatus: http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			out, err := athlete.NewAthleteService(NewFakeAthleteRepository()).ListAthleteCompetitors(
				t.Context(), &athlete.AthleteHistoryInput{ID: tt.id, Limit: tt.limit, Offset: tt.offset})
			if tt.wantStatus != 0 {
				assert.Equal(t, tt.wantStatus, apiStatus(t, err))
				return
			}
			require.NoError(t, err)
			assert.Len(t, out.Body.Data, tt.wantLen)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
			assert.Equal(t, tt.wantOffset, out.Body.Offset)
		})
	}
}

func TestSearchAthletes(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		query      string
		wantNames  []string
		wantStatus int
	}{
		{name: "matches by first name", query: "maya", wantNames: []string{"Maya"}},
		{name: "trims the term", query: "  kenji ", wantNames: []string{"Kenji"}},
		{name: "no match", query: "zzz"},
		{name: "blank term", query: "   ", wantStatus: http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			out, err := athlete.NewAthleteService(NewFakeAthleteRepository()).SearchAthletes(
				t.Context(), &athlete.AthleteSearchInput{Query: tt.query})
			if tt.wantStatus != 0 {
				assert.Equal(t, tt.wantStatus, apiStatus(t, err))
				return
			}
			require.NoError(t, err)
			var names []string
			for _, a := range out.Body.Data {
				names = append(names, a.FirstName)
			}
			assert.Equal(t, tt.wantNames, names)
			assert.Equal(t, int64(len(tt.wantNames)), out.Body.Total)
			assert.Equal(t, 20, out.Body.Limit)
		})
	}
}
