package directelimination

import (
	"context"
	"errors"
	"fmt"
	"math/rand/v2"

	"boutline/internal/errs"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"
	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

// Huma applies these defaults over HTTP; a direct call with zero values gets the same ones.
const (
	defaultAdvancePercent   = 100
	defaultDrawPointsToWin  = 15
	defaultDrawTimeLimitSec = 180
)

type DrawService interface {
	GenerateDirectElimination(
		ctx context.Context,
		input *DirectEliminationGenerateInput,
	) (*DirectEliminationDrawOutput, error)
}

type drawService struct {
	repo        DrawRepository
	memberships tournamentuser.MembershipLookup
	newRNG      func() *rand.Rand
}

// newRNG is a factory because *rand.Rand is not safe for concurrent use.
func NewDrawService(
	repo DrawRepository,
	memberships tournamentuser.MembershipLookup,
	newRNG func() *rand.Rand,
) DrawService {
	return &drawService{repo: repo, memberships: memberships, newRNG: newRNG}
}

func (s *drawService) GenerateDirectElimination(
	ctx context.Context,
	input *DirectEliminationGenerateInput,
) (*DirectEliminationDrawOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	// The role check runs before the lock, so a refused caller never holds it and the
	// membership lookup never needs a second connection while the transaction holds one.
	tournamentID, err := s.repo.GetDirectEliminationTournamentID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("generate direct elimination: %w", err))
	}
	err = tournamentuser.RequireRole(ctx, s.memberships, tournamentID, tournamentuser.TournamentUserRoleAdmin)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("generate direct elimination: %w", err))
	}

	var response DirectEliminationDrawResponse
	err = s.repo.WithLockedDirectElimination(ctx, id, func(repo DrawRepository, de LockedDirectElimination) error {
		var err error
		response, err = s.draw(ctx, repo, id, de, input.Body)
		return err
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("generate direct elimination: %w", err))
	}

	return &DirectEliminationDrawOutput{Body: response}, nil
}

func (s *drawService) draw(
	ctx context.Context,
	repo DrawRepository,
	id uuid.UUID,
	de LockedDirectElimination,
	body DirectEliminationGenerateBody,
) (DirectEliminationDrawResponse, error) {
	stage, err := checkDrawable(ctx, repo, id, de)
	if err != nil {
		return DirectEliminationDrawResponse{}, err
	}

	fencers, bouts, err := repo.ListPoolStageStandingRows(ctx, stage.ID)
	if err != nil {
		return DirectEliminationDrawResponse{}, err
	}

	competitorIDs := make([]uuid.UUID, 0, len(fencers))
	for _, fencer := range fencers {
		competitorIDs = append(competitorIDs, fencer.CompetitorID)
	}

	advance := orDefault(body.AdvancePercent, defaultAdvancePercent)
	draw, err := DrawTableau(pool.RankPoolStage(competitorIDs, bouts), advance, s.newRNG())
	if err != nil {
		return DirectEliminationDrawResponse{}, err
	}

	entries := make([]DrawEntry, 0, len(draw.Seeds))
	for i, competitorID := range draw.Seeds {
		entries = append(entries, DrawEntry{DirectEliminationID: id, CompetitorID: competitorID, Seed: i + 1})
	}

	drawBouts := make([]DrawBout, 0, len(draw.FirstRound))
	for _, pairing := range draw.FirstRound {
		drawBouts = append(drawBouts, DrawBout{
			TournamentID:        de.TournamentID,
			DirectEliminationID: id,
			RoundSize:           draw.Size,
			Slot:                pairing.Slot,
			Competitor1ID:       pairing.Top,
			Competitor2ID:       pairing.Bottom,
			PointsToWin:         orDefault(body.PointsToWin, defaultDrawPointsToWin),
			TimeLimitSeconds:    orDefault(body.TimeLimitSeconds, defaultDrawTimeLimitSec),
			Status:              drawBoutStatusUpcoming,
		})
	}

	if err := repo.CreateDraw(ctx, entries, drawBouts); err != nil {
		return DirectEliminationDrawResponse{}, err
	}

	return newDirectEliminationDrawResponse(id.String(), draw.Size, entries, drawBouts), nil
}

// checkDrawable runs the draw's preconditions in the order a client should hear about them
// and returns the ended pool stage that seeds the tableau.
func checkDrawable(
	ctx context.Context,
	repo DrawRepository,
	id uuid.UUID,
	de LockedDirectElimination,
) (*poolstage.PoolStage, error) {
	if de.Status != DirectEliminationStatusUpcoming {
		return nil, errs.Public("only an upcoming direct elimination can be drawn", errs.ErrConflict)
	}

	existing, err := repo.CountDirectEliminationEntries(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing > 0 {
		return nil, errs.Public("the tableau has already been drawn", errs.ErrConflict)
	}

	if de.TournamentStatus != tournament.TournamentStatusActive {
		return nil, errs.Public("a tableau can only be drawn in an active tournament", errs.ErrConflict)
	}

	stage, err := repo.GetEventPoolStage(ctx, de.EventID)
	if err != nil && !errors.Is(err, errs.ErrNotFound) {
		return nil, err
	}
	if err != nil || stage.Status != poolstage.PoolStageStatusEnded {
		return nil, errs.Public("the event's pool stage must end before the tableau can be drawn", errs.ErrConflict)
	}

	return stage, nil
}

func orDefault(value, fallback int) int {
	if value == 0 {
		return fallback
	}
	return value
}
