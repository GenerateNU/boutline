package athlete

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/tournament"
	"boutline/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const upsertAthleteByMemberNumberSQL = `
INSERT INTO athletes (member_number, created_at, updated_at) VALUES (?, now(), now())
ON CONFLICT (member_number) DO UPDATE SET updated_at = now()
RETURNING id`

const (
	publicHistoryJoin = "JOIN tournaments ON tournaments.id = competitors.tournament_id " +
		"AND tournaments.visibility = ? AND tournaments.status = ?"
	recencyOrder = "COALESCE(tournaments.start_time, tournaments.created_at) DESC"

	athleteNameTrigramExpr = "competitors.first_name || ' ' || competitors.last_name"
)

const athleteProfilesSQL = `
SELECT DISTINCT ON (athletes.id) athletes.id,
  COALESCE(users.first_name, competitors.first_name) AS first_name,
  COALESCE(users.last_name, competitors.last_name) AS last_name,
  athletes.user_id IS NOT NULL AS claimed
FROM athletes
JOIN competitors ON competitors.athlete_id = athletes.id
` + publicHistoryJoin + `
LEFT JOIN users ON users.id = athletes.user_id
WHERE athletes.id IN ?
ORDER BY athletes.id, ` + recencyOrder + `, competitors.created_at DESC`

type AthleteRepository interface {
	UpsertAthleteByMemberNumber(ctx context.Context, memberNumber string) (uuid.UUID, error)
	GetAthleteProfile(ctx context.Context, id uuid.UUID) (*AthleteProfile, error)
	ListAthleteHistory(ctx context.Context, filter AthleteHistoryFilter) ([]AthleteHistoryEntry, int64, error)
	SearchAthleteProfiles(ctx context.Context, filter AthleteSearchFilter) ([]AthleteProfile, int64, error)
}

type AthleteProfile struct {
	ID        uuid.UUID
	FirstName string
	LastName  string
	Claimed   bool
}

type AthleteHistoryEntry struct {
	CompetitorID   uuid.UUID
	TournamentID   uuid.UUID
	TournamentName string
	EventID        uuid.UUID
	Rating         string
	Club           *string
}

type AthleteHistoryFilter struct {
	AthleteID uuid.UUID
	Limit     int
	Offset    int
}

type AthleteSearchFilter struct {
	Term   string
	Limit  int
	Offset int
}

type athleteRepository struct {
	db *gorm.DB
}

func NewAthleteRepository(db *gorm.DB) AthleteRepository {
	return &athleteRepository{db: db}
}

func (r *athleteRepository) UpsertAthleteByMemberNumber(ctx context.Context, memberNumber string) (uuid.UUID, error) {
	var id uuid.UUID
	if err := r.db.WithContext(ctx).Raw(upsertAthleteByMemberNumberSQL, memberNumber).Row().Scan(&id); err != nil {
		return uuid.Nil, fmt.Errorf("upsert athlete: %w", err)
	}
	return id, nil
}

func (r *athleteRepository) publicHistory(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx).Table("competitors").Joins(
		publicHistoryJoin, tournament.TournamentVisibilityPublic, tournament.TournamentStatusEnded)
}

func (r *athleteRepository) athleteProfiles(ctx context.Context, ids []uuid.UUID) ([]AthleteProfile, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var profiles []AthleteProfile
	err := r.db.WithContext(ctx).Raw(athleteProfilesSQL,
		tournament.TournamentVisibilityPublic, tournament.TournamentStatusEnded, ids).Scan(&profiles).Error
	if err != nil {
		return nil, fmt.Errorf("select athlete profiles: %w", err)
	}
	return profiles, nil
}

func (r *athleteRepository) GetAthleteProfile(ctx context.Context, id uuid.UUID) (*AthleteProfile, error) {
	profiles, err := r.athleteProfiles(ctx, []uuid.UUID{id})
	if err != nil {
		return nil, err
	}
	if len(profiles) == 0 {
		return nil, fmt.Errorf("select athlete %s: %w", id, errs.ErrNotFound)
	}
	return &profiles[0], nil
}

func (r *athleteRepository) ListAthleteHistory(
	ctx context.Context,
	filter AthleteHistoryFilter,
) ([]AthleteHistoryEntry, int64, error) {
	var total int64
	err := r.publicHistory(ctx).Where("competitors.athlete_id = ?", filter.AthleteID).Count(&total).Error
	if err != nil {
		return nil, 0, fmt.Errorf("count athlete history: %w", err)
	}

	var entries []AthleteHistoryEntry
	err = r.publicHistory(ctx).
		Select("competitors.id AS competitor_id, competitors.tournament_id, tournaments.name AS tournament_name, "+
			"competitors.event_id, competitors.rating, "+
			"COALESCE(competitors.primary_club, NULLIF(competitors.team, '')) AS club").
		Where("competitors.athlete_id = ?", filter.AthleteID).
		Order(recencyOrder + ", competitors.id").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Scan(&entries).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select athlete history: %w", err)
	}
	return entries, total, nil
}

func (r *athleteRepository) SearchAthleteProfiles(
	ctx context.Context,
	filter AthleteSearchFilter,
) ([]AthleteProfile, int64, error) {
	search := func() *gorm.DB {
		return utils.TrigramMatch(
			r.publicHistory(ctx).Where("competitors.athlete_id IS NOT NULL"),
			athleteNameTrigramExpr, filter.Term)
	}

	var total int64
	if err := search().Select("COUNT(DISTINCT competitors.athlete_id)").Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count athlete search: %w", err)
	}

	var ids []uuid.UUID
	err := search().
		Select("competitors.athlete_id").
		Group("competitors.athlete_id").
		Clauses(clause.OrderBy{Expression: clause.Expr{
			SQL:  "MAX(word_similarity(?, " + athleteNameTrigramExpr + ")) DESC, competitors.athlete_id",
			Vars: []any{filter.Term},
		}}).
		Limit(filter.Limit).
		Offset(filter.Offset).
		Scan(&ids).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select athlete search ids: %w", err)
	}

	profiles, err := r.athleteProfiles(ctx, ids)
	if err != nil {
		return nil, 0, err
	}
	byID := make(map[uuid.UUID]AthleteProfile, len(profiles))
	for _, p := range profiles {
		byID[p.ID] = p
	}
	ranked := make([]AthleteProfile, 0, len(ids))
	for _, id := range ids {
		if p, ok := byID[id]; ok {
			ranked = append(ranked, p)
		}
	}
	return ranked, total, nil
}
