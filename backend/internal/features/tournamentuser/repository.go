package tournamentuser

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TournamentUserRepository interface {
	CreateTournamentUser(ctx context.Context, membership *TournamentUser) error
	GetTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) (*TournamentUser, error)
	ListRolesByUser(ctx context.Context, userID uuid.UUID, tournamentIDs []uuid.UUID) (map[uuid.UUID]TournamentUserRole, error)
	ListMembersByTournament(
		ctx context.Context,
		tournamentID uuid.UUID,
		filter TournamentUserFilter,
	) ([]TournamentMember, int64, error)
	UpdateTournamentUserRole(ctx context.Context, tournamentID, userID uuid.UUID, role TournamentUserRole) error
	DeleteTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) error
}

type TournamentUserFilter struct {
	Role   TournamentUserRole // empty means any role
	Term   string
	Limit  int
	Offset int
}

// Joined like idx_users_name_trgm, so the trigram index serves the search.
var memberNameSearchColumns = []string{"users.first_name", "users.last_name"}

// The member's unfinished pools in this tournament, for the two columns below.
const memberOpenPoolsSQL = `FROM pools
	JOIN pool_stages ON pool_stages.id = pools.pool_stage_id
	JOIN events ON events.id = pool_stages.event_id
	WHERE pools.referee_id = tournament_users.user_id
		AND events.tournament_id = tournament_users.tournament_id
		AND pools.completed_at IS NULL`

// Occupied means running a pool right now or refereeing an active bout.
const memberOccupiedSQL = `(EXISTS (SELECT 1 ` + memberOpenPoolsSQL + ` AND pools.started_at IS NOT NULL)
	OR EXISTS (SELECT 1 FROM bouts
		WHERE bouts.referee_id = tournament_users.user_id
			AND bouts.tournament_id = tournament_users.tournament_id
			AND bouts.status = 'active')) AS occupied`

// The pool they're running now, else the next one they're down for.
const memberPoolNumberSQL = `(SELECT pools.number ` + memberOpenPoolsSQL + `
	ORDER BY pools.started_at IS NULL, pools.start_time NULLS LAST, pools.number
	LIMIT 1) AS pool_number`

type tournamentUserRepository struct {
	db *gorm.DB
}

func NewTournamentUserRepository(db *gorm.DB) TournamentUserRepository {
	return &tournamentUserRepository{db: db}
}

func (r *tournamentUserRepository) CreateTournamentUser(ctx context.Context, membership *TournamentUser) error {
	if err := r.db.WithContext(ctx).Create(membership).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create tournament user: %w", errs.ErrDuplicate)
		}
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("create tournament user: %w",
				errs.Public("user_id and tournament_id must reference an existing user and tournament",
					errs.ErrInvalidInput))
		}
		return fmt.Errorf("create tournament user: %w", err)
	}

	return nil
}

func (r *tournamentUserRepository) ListMembersByTournament(
	ctx context.Context,
	tournamentID uuid.UUID,
	filter TournamentUserFilter,
) ([]TournamentMember, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&TournamentUser{}).
		Joins("JOIN users ON users.id = tournament_users.user_id").
		Where("tournament_users.tournament_id = ?", tournamentID)
	if filter.Role != "" {
		query = query.Where("tournament_users.role = ?", filter.Role)
	}
	query = utils.TrigramMatch(query, memberNameSearchColumns, filter.Term)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count users in tournament %s: %w", tournamentID, err)
	}

	query = utils.TrigramOrder(query, memberNameSearchColumns, filter.Term,
		"tournament_users.created_at", "tournament_users.user_id")

	members := make([]TournamentMember, 0, filter.Limit)
	err := query.
		Select("tournament_users.user_id, tournament_users.tournament_id, tournament_users.role, " +
			"tournament_users.created_at, tournament_users.updated_at, users.first_name, users.last_name, " +
			memberOccupiedSQL + ", " + memberPoolNumberSQL).
		Limit(filter.Limit).
		Offset(filter.Offset).
		Scan(&members).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select users in tournament %s: %w", tournamentID, err)
	}

	return members, total, nil
}

func (r *tournamentUserRepository) UpdateTournamentUserRole(
	ctx context.Context,
	tournamentID, userID uuid.UUID,
	role TournamentUserRole,
) error {
	result := r.db.WithContext(ctx).
		Model(&TournamentUser{}).
		Where("tournament_id = ? AND user_id = ?", tournamentID, userID).
		Update("role", role)
	if result.Error != nil {
		return fmt.Errorf("update tournament user %s/%s: %w", tournamentID, userID, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("update tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
	}

	return nil
}

func (r *tournamentUserRepository) DeleteTournamentUser(
	ctx context.Context,
	tournamentID, userID uuid.UUID,
) error {
	result := r.db.WithContext(ctx).
		Where("tournament_id = ? AND user_id = ?", tournamentID, userID).
		Delete(&TournamentUser{})
	if result.Error != nil {
		return fmt.Errorf("delete tournament user %s/%s: %w", tournamentID, userID, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("delete tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
	}

	return nil
}

func (r *tournamentUserRepository) GetTournamentUser(
	ctx context.Context,
	tournamentID, userID uuid.UUID,
) (*TournamentUser, error) {
	var membership TournamentUser

	err := r.db.WithContext(ctx).
		Where("tournament_id = ? AND user_id = ?", tournamentID, userID).
		First(&membership).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select tournament user %s/%s: %w", tournamentID, userID, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select tournament user %s/%s: %w", tournamentID, userID, err)
	}

	return &membership, nil
}

func (r *tournamentUserRepository) ListRolesByUser(
	ctx context.Context,
	userID uuid.UUID,
	tournamentIDs []uuid.UUID,
) (map[uuid.UUID]TournamentUserRole, error) {
	roles := make(map[uuid.UUID]TournamentUserRole, len(tournamentIDs))
	if len(tournamentIDs) == 0 {
		return roles, nil
	}

	var memberships []TournamentUser
	err := r.db.WithContext(ctx).
		Select("tournament_id", "role").
		Where("user_id = ? AND tournament_id IN ?", userID, tournamentIDs).
		Find(&memberships).Error
	if err != nil {
		return nil, fmt.Errorf("select roles of user %s: %w", userID, err)
	}

	for _, membership := range memberships {
		roles[membership.TournamentID] = membership.Role
	}

	return roles, nil
}
