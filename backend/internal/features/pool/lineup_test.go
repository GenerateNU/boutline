package pool

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewPoolLineupKeepsTheGivenOrder(t *testing.T) {
	t.Parallel()

	// Out of uuid order, so a sort of any kind would show.
	fencers := []uuid.UUID{
		uuid.MustParse("ffffffff-0000-0000-0000-000000000000"),
		uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		uuid.MustParse("00000000-0000-0000-0000-000000000002"),
	}

	lineup := newPoolLineup(Pool{}, fencers, uuid.New(), 5, 180)

	assert.Equal(t, fencers, lineup.Fencers)
}

func TestNewPoolLineupBouts(t *testing.T) {
	t.Parallel()

	fencers := []uuid.UUID{uuid.New(), uuid.New(), uuid.New(), uuid.New()}
	tournamentID := uuid.New()
	refereeID := uuid.New()
	strip := "A1"
	pool := Pool{Number: 3, Strip: &strip, RefereeID: &refereeID}

	lineup := newPoolLineup(pool, fencers, tournamentID, 5, 180)

	order := poolBoutOrder(4)
	require.Len(t, lineup.Bouts, len(order))
	for k, bout := range lineup.Bouts {
		pair := order[k]

		assert.Equal(t, k+1, bout.Slot)
		assert.Equal(t, fencers[pair[0]-1], bout.Competitor1ID)
		assert.Equal(t, fencers[pair[1]-1], bout.Competitor2ID)
		assert.Equal(t, tournamentID, bout.TournamentID)
		assert.Equal(t, &strip, bout.Location)
		assert.Equal(t, &refereeID, bout.RefereeID)
		assert.Equal(t, 5, bout.PointsToWin)
		assert.Equal(t, 180, bout.TimeLimitSeconds)
		assert.Equal(t, 3, bout.GroupNumber)
		assert.Equal(t, "upcoming", bout.Status)
	}
}
