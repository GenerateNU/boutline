package test

import (
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/competitor"
	"boutline/internal/session"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCheckIn(t *testing.T) {
	t.Parallel()
	checkedInAt := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	unchecked := seeded("Lee", "Kiefer", competitor.RatingA, "")
	checked := seeded("Mariel", "Zagunis", competitor.RatingA, "")
	checked.CheckedInAt = &checkedInAt

	tests := []struct {
		name        string
		caller      *uuid.UUID
		stored      competitor.Competitor
		checkedIn   bool
		wantStatus  int
		wantChecked bool
	}{
		{name: "admin checks in", caller: ptr(TestAdminID), stored: unchecked, checkedIn: true, wantStatus: http.StatusOK, wantChecked: true},
		{name: "admin clears a check-in", caller: ptr(TestAdminID), stored: checked, checkedIn: false, wantStatus: http.StatusOK},
		{name: "referee is refused", caller: ptr(TestRefereeID), stored: unchecked, checkedIn: true, wantStatus: http.StatusForbidden},
		{name: "admin of another tournament is refused", caller: ptr(TestOtherAdminID), stored: checked, checkedIn: false, wantStatus: http.StatusForbidden, wantChecked: true},
		{name: "anonymous is refused", stored: unchecked, checkedIn: true, wantStatus: http.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := NewFakeCompetitorRepository(tt.stored)
			ctx := t.Context()
			if tt.caller != nil {
				ctx = session.WithUserID(ctx, *tt.caller)
			}

			out, err := NewTestService(repo).UpdateCompetitorByID(ctx, &competitor.CompetitorUpdateInput{
				ID: tt.stored.ID.String(), Body: competitor.CompetitorUpdateBody{CheckedIn: ptr(tt.checkedIn)},
			})

			if tt.wantStatus == http.StatusOK {
				require.NoError(t, err)
				assert.Equal(t, tt.wantChecked, out.Body.CheckedInAt != nil)
			} else {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantStatus, code)
			}
			assert.Equal(t, tt.wantChecked, repo.Competitors[tt.stored.ID].CheckedInAt != nil)
		})
	}
}

func TestCheckInEndpoint(t *testing.T) {
	t.Parallel()
	stored := seeded("Lee", "Kiefer", competitor.RatingA, "")
	path := "/api/v1/competitors/" + stored.ID.String()

	t.Run("patch returns the check-in time", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, stored).PatchCtx(adminCtx(t), path, map[string]any{"checkedIn": true})
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		assert.IsType(t, "", decodeBody(t, resp.Body.Bytes())["checkedInAt"])
	})

	t.Run("get reports null for an unchecked competitor", func(t *testing.T) {
		t.Parallel()
		resp := newTestAPI(t, stored).Get(path)
		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		value, present := decodeBody(t, resp.Body.Bytes())["checkedInAt"]
		assert.True(t, present)
		assert.Nil(t, value)
	})
}

func TestListCompetitorsCountsCheckedIn(t *testing.T) {
	t.Parallel()
	checkedInAt := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	checked := seeded("Mariel", "Zagunis", competitor.RatingA, "")
	checked.CheckedInAt = &checkedInAt
	repo := NewFakeCompetitorRepository(checked,
		seeded("Lee", "Kiefer", competitor.RatingA, ""), seeded("Alex", "Massialas", competitor.RatingA, ""))

	tests := []struct {
		name          string
		query         string
		wantTotal     int64
		wantCheckedIn int64
	}{
		{name: "counts every match, not just the page", wantTotal: 3, wantCheckedIn: 1},
		{name: "follows the filter", query: "kiefer", wantTotal: 1, wantCheckedIn: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			out, err := NewTestService(repo).ListCompetitors(t.Context(), &competitor.CompetitorListInput{Query: tt.query, Limit: 1})

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantCheckedIn, out.Body.CheckedIn)
		})
	}
}
