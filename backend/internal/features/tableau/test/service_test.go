package test

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/bout"
	"boutline/internal/features/event"
	"boutline/internal/features/scoring"
	"boutline/internal/features/tableau"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fixture struct {
	eventID uuid.UUID
	deID    uuid.UUID
	repo    *FakeTableauRepository
}

func newFixture(entryCount int, bouts ...tableau.BoutRow) fixture {
	eventID, deID := uuid.New(), uuid.New()

	return fixture{
		eventID: eventID,
		deID:    deID,
		repo: &FakeTableauRepository{
			Tableaus: map[uuid.UUID]tableau.TableauRow{eventID: {ID: deID, EntryCount: entryCount}},
			Bouts:    map[uuid.UUID][]tableau.BoutRow{deID: bouts},
		},
	}
}

func (f fixture) service() tableau.TableauService {
	events := &FakeEventLookup{Events: map[uuid.UUID]event.Event{f.eventID: {ID: f.eventID}}}

	return tableau.NewTableauService(f.repo, events)
}

func ptr[T any](v T) *T { return &v }

func boutRow(roundSize, slot int, status bout.BoutStatus) tableau.BoutRow {
	return tableau.BoutRow{
		ID: uuid.New(), RoundSize: roundSize, Slot: slot, Status: status,
		TopID: uuid.New(), TopFirst: "Maya", TopLast: "Chen", TopClub: "Boston Fencing Club", TopSeed: ptr(1),
		BottomID: uuid.New(), BottomFirst: "Kenji", BottomLast: "Tanaka", BottomClub: "Northeastern Fencing", BottomSeed: ptr(4),
	}
}

func roundSizes(rounds []tableau.RoundResponse) []int {
	sizes := make([]int, len(rounds))
	for i, r := range rounds {
		sizes[i] = r.Size
	}

	return sizes
}

func apiStatus(t *testing.T, err error) int {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status
}

func TestGetTableauErrors(t *testing.T) {
	t.Parallel()

	missingEntry := boutRow(2, 1, bout.BoutStatusUpcoming)
	missingEntry.BottomSeed = nil
	broken := newFixture(2, missingEntry)

	failing := newFixture(2)
	failing.repo.Err = errors.New("connection reset")

	tests := []struct {
		name       string
		fx         fixture
		id         string
		wantStatus int
	}{
		{name: "malformed event id is a bad request", fx: newFixture(2), id: "not-a-uuid", wantStatus: http.StatusBadRequest},
		{name: "unknown event is 404", fx: newFixture(2), id: uuid.NewString(), wantStatus: http.StatusNotFound},
		{name: "fencer with no entry row is 500", fx: broken, id: broken.eventID.String(), wantStatus: http.StatusInternalServerError},
		{name: "repository failure is 500", fx: failing, id: failing.eventID.String(), wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, err := tt.fx.service().GetTableau(t.Context(), &tableau.TableauInput{ID: tt.id})

			require.Error(t, err)
			assert.Equal(t, tt.wantStatus, apiStatus(t, err))
		})
	}
}

func TestGetTableauRounds(t *testing.T) {
	t.Parallel()

	noEntries := newFixture(0)
	undrawn := newFixture(4)
	undrawn.repo.Tableaus = nil

	tests := []struct {
		name      string
		fx        fixture
		wantSizes []int
	}{
		{name: "no direct elimination returns no rounds", fx: undrawn, wantSizes: []int{}},
		{name: "zero entries returns no rounds", fx: noEntries, wantSizes: []int{}},
		{name: "two entries is just the final", fx: newFixture(2), wantSizes: []int{2}},
		{name: "four entries returns semis and final", fx: newFixture(4), wantSizes: []int{4, 2}},
		{name: "six entries rounds up to a table of eight", fx: newFixture(6), wantSizes: []int{8, 4, 2}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := tt.fx.service().GetTableau(t.Context(), &tableau.TableauInput{ID: tt.fx.eventID.String()})

			require.NoError(t, err)
			require.NotNil(t, out.Body.Rounds)
			assert.Equal(t, tt.wantSizes, roundSizes(out.Body.Rounds))
			for _, r := range out.Body.Rounds {
				assert.NotNil(t, r.Bouts)
				assert.Empty(t, r.Bouts)
			}
		})
	}
}

func TestGetTableauBouts(t *testing.T) {
	t.Parallel()

	upcoming := boutRow(4, 2, bout.BoutStatusUpcoming)
	ended := boutRow(4, 1, bout.BoutStatusEnded)
	final := boutRow(2, 1, bout.BoutStatusActive)

	fx := newFixture(4, upcoming, ended, final)
	revoked := time.Now()
	fx.repo.Scorings = []scoring.Scoring{
		{BoutID: ended.ID, CompetitorID: ended.TopID, Points: 5},
		{BoutID: ended.ID, CompetitorID: ended.TopID, Points: 10},
		{BoutID: ended.ID, CompetitorID: ended.TopID, Points: 3, RevokedAt: &revoked},
		{BoutID: ended.ID, CompetitorID: ended.BottomID, Points: 9},
		{BoutID: upcoming.ID, CompetitorID: upcoming.TopID, Points: 1},
	}

	out, err := fx.service().GetTableau(t.Context(), &tableau.TableauInput{ID: fx.eventID.String()})
	require.NoError(t, err)
	require.Equal(t, []int{4, 2}, roundSizes(out.Body.Rounds))

	semis, finals := out.Body.Rounds[0].Bouts, out.Body.Rounds[1].Bouts
	require.Len(t, semis, 2)
	assert.Equal(t, []int{1, 2}, []int{semis[0].Slot, semis[1].Slot}, "bouts are ordered by slot")

	assert.Equal(t, ended.ID.String(), semis[0].ID)
	assert.Equal(t, ptr(15), semis[0].TopScore, "revoked points are excluded")
	assert.Equal(t, ptr(9), semis[0].BottomScore)
	assert.Equal(t, "Boston Fencing Club", semis[0].Top.Club)
	assert.Equal(t, 4, semis[0].Bottom.Seed)

	assert.Nil(t, semis[1].TopScore, "upcoming bouts have no score")
	assert.Nil(t, semis[1].BottomScore)

	require.Len(t, finals, 1)
	assert.Equal(t, ptr(0), finals[0].TopScore, "a started bout with no scorings is 0")
	assert.Equal(t, ptr(0), finals[0].BottomScore)
}
