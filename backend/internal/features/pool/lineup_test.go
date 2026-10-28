package pool

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewPoolLineupSeating(t *testing.T) {
	t.Parallel()

	early := time.Date(2026, 1, 1, 9, 0, 0, 0, time.UTC)
	late := early.Add(time.Hour)
	low := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	mid := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	high := uuid.MustParse("ffffffff-0000-0000-0000-000000000000")

	tests := []struct {
		name     string
		entrants []PoolEntrant
		want     []uuid.UUID
	}{
		{
			name:     "earlier registration sits first whatever the input order",
			entrants: []PoolEntrant{{ID: low, CreatedAt: late}, {ID: high, CreatedAt: early}, {ID: mid, CreatedAt: late}},
			want:     []uuid.UUID{high, low, mid},
		},
		{
			name:     "equal created_at falls back to the id",
			entrants: []PoolEntrant{{ID: high, CreatedAt: early}, {ID: low, CreatedAt: early}, {ID: mid, CreatedAt: early}},
			want:     []uuid.UUID{low, mid, high},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			original := append([]PoolEntrant(nil), tt.entrants...)

			lineup := newPoolLineup(Pool{}, tt.entrants, uuid.New(), 5, 180)

			assert.Equal(t, tt.want, lineup.Fencers)
			assert.Equal(t, original, tt.entrants, "input must not be reordered")
		})
	}
}

func TestNewPoolLineupBouts(t *testing.T) {
	t.Parallel()

	base := time.Date(2026, 1, 1, 9, 0, 0, 0, time.UTC)
	entrants := make([]PoolEntrant, 4)
	for i := range entrants {
		entrants[i] = PoolEntrant{ID: uuid.New(), CreatedAt: base.Add(time.Duration(i) * time.Minute)}
	}
	tournamentID := uuid.New()
	refereeID := uuid.New()
	strip := "A1"
	pool := Pool{Number: 3, Strip: &strip, RefereeID: &refereeID}

	lineup := newPoolLineup(pool, entrants, tournamentID, 5, 180)

	order := poolBoutOrder(4)
	require.Len(t, lineup.Bouts, len(order))
	for k, bout := range lineup.Bouts {
		pair := order[k]

		assert.Equal(t, k+1, bout.GroupSlot)
		assert.Equal(t, entrants[pair[0]-1].ID, bout.Competitor1ID)
		assert.Equal(t, entrants[pair[1]-1].ID, bout.Competitor2ID)
		assert.Equal(t, tournamentID, bout.TournamentID)
		assert.Equal(t, &strip, bout.Location)
		assert.Equal(t, &refereeID, bout.RefereeID)
		assert.Equal(t, 5, bout.PointsToWin)
		assert.Equal(t, 180, bout.TimeLimitSeconds)
		assert.Equal(t, 3, bout.GroupNumber)
		assert.Equal(t, "upcoming", bout.Status)
	}
}
