package repository

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    "esports-manager/internal/db"
    "esports-manager/internal/models"

    "github.com/jackc/pgx/v5"
)

type TournamentRepository struct {
    db *db.PostgresDB
}

func NewTournamentRepository(db *db.PostgresDB) *TournamentRepository {
    return &TournamentRepository{db: db}
}

// Create - создание нового турнира
func (r *TournamentRepository) Create(ctx context.Context, tournament *models.TournamentCreate, organizerID int) (*models.Tournament, error) {
    query := `
        INSERT INTO tournaments (title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, is_vip, banner_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, is_vip, banner_url, created_at, updated_at`

    var newTournament models.Tournament
    err := r.db.Pool.QueryRow(ctx, query,
        tournament.Title, tournament.Game, tournament.Description,
        tournament.StartDate, tournament.RegistrationDeadline,
        tournament.EntryFee, tournament.PrizePool, tournament.MaxTeams,
        models.TournamentStatusPending, organizerID,
        tournament.IsVIP, tournament.BannerURL,
    ).Scan(
        &newTournament.ID, &newTournament.Title, &newTournament.Game, &newTournament.Description,
        &newTournament.StartDate, &newTournament.RegistrationDeadline,
        &newTournament.EntryFee, &newTournament.PrizePool, &newTournament.MaxTeams,
        &newTournament.Status, &newTournament.OrganizerID,
        &newTournament.IsVIP, &newTournament.BannerURL,
        &newTournament.CreatedAt, &newTournament.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create tournament: %w", err)
    }

    return &newTournament, nil
}

// FindByID - поиск турнира по ID
func (r *TournamentRepository) FindByID(ctx context.Context, id int) (*models.Tournament, error) {
    query := `
        SELECT id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, approved_by, approved_at, is_vip, banner_url, created_at, updated_at
        FROM tournaments
        WHERE id = $1
    `

    var tournament models.Tournament
    err := r.db.Pool.QueryRow(ctx, query, id).Scan(
        &tournament.ID, &tournament.Title, &tournament.Game, &tournament.Description,
        &tournament.StartDate, &tournament.RegistrationDeadline,
        &tournament.EntryFee, &tournament.PrizePool, &tournament.MaxTeams,
        &tournament.Status, &tournament.OrganizerID,
        &tournament.ApprovedBy, &tournament.ApprovedAt,
        &tournament.IsVIP, &tournament.BannerURL,
        &tournament.CreatedAt, &tournament.UpdatedAt,
    )
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to find tournament: %w", err)
    }

    return &tournament, nil
}

// ClientTournamentFilter — фильтры витрины турниров
type ClientTournamentFilter struct {
	OrganizerID int
	DateFrom    *time.Time
	DateTo      *time.Time
	IsVIP       *bool
}

// ListForClient — турниры для клиентской витрины (из PostgreSQL)
func (r *TournamentRepository) ListForClient(ctx context.Context, f ClientTournamentFilter) ([]*models.Tournament, error) {
	query := `
        SELECT id, title, game, COALESCE(description, ''), start_date, registration_deadline,
               entry_fee, prize_pool, max_teams, status, organizer_id, is_vip, COALESCE(banner_url, ''), created_at, updated_at
        FROM tournaments
        WHERE status IN ('approved', 'ongoing', 'pending')
          AND ($1 = 0 OR organizer_id = $1)
          AND ($2::timestamptz IS NULL OR start_date >= $2)
          AND ($3::timestamptz IS NULL OR start_date <= $3)
          AND ($4::boolean IS NULL OR is_vip = $4)
        ORDER BY start_date ASC
    `

	var orgID int
	if f.OrganizerID > 0 {
		orgID = f.OrganizerID
	}
	var dateFrom, dateTo interface{}
	if f.DateFrom != nil {
		dateFrom = *f.DateFrom
	}
	if f.DateTo != nil {
		dateTo = *f.DateTo
	}
	var isVIP interface{}
	if f.IsVIP != nil {
		isVIP = *f.IsVIP
	}

	rows, err := r.db.Pool.Query(ctx, query, orgID, dateFrom, dateTo, isVIP)
	if err != nil {
		return nil, fmt.Errorf("failed to list client tournaments: %w", err)
	}
	defer rows.Close()

	var tournaments []*models.Tournament
	for rows.Next() {
		var t models.Tournament
		var bannerURL string
		if err := rows.Scan(
			&t.ID, &t.Title, &t.Game, &t.Description,
			&t.StartDate, &t.RegistrationDeadline,
			&t.EntryFee, &t.PrizePool, &t.MaxTeams,
			&t.Status, &t.OrganizerID, &t.IsVIP, &bannerURL,
			&t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan tournament: %w", err)
		}
		if bannerURL != "" {
			t.BannerURL = &bannerURL
		}
		tournaments = append(tournaments, &t)
	}
	return tournaments, nil
}

// ListClientOrganizers — организаторы с активными турнирами (для фильтра)
func (r *TournamentRepository) ListClientOrganizers(ctx context.Context) ([]struct {
	ID       int
	Username string
}, error) {
	query := `
        SELECT DISTINCT u.id, u.username
        FROM tournaments t
        JOIN users u ON u.id = t.organizer_id
        WHERE t.status IN ('approved', 'ongoing', 'pending')
        ORDER BY u.username
    `
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list organizers: %w", err)
	}
	defer rows.Close()
	var out []struct {
		ID       int
		Username string
	}
	for rows.Next() {
		var row struct {
			ID       int
			Username string
		}
		if err := rows.Scan(&row.ID, &row.Username); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, nil
}

// List - список турниров с фильтрацией и пагинацией
func (r *TournamentRepository) List(ctx context.Context, game string, status models.TournamentStatus, limit, offset int) ([]*models.Tournament, error) {
    query := `
        SELECT id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, is_vip, banner_url, created_at, updated_at
        FROM tournaments
        WHERE ($1 = '' OR game = $1)
          AND ($2 = '' OR status = $2)
        ORDER BY start_date
        LIMIT $3 OFFSET $4
    `

    rows, err := r.db.Pool.Query(ctx, query, game, status, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("failed to list tournaments: %w", err)
    }
    defer rows.Close()

    var tournaments []*models.Tournament
    var description sql.NullString
    for rows.Next() {
        var t models.Tournament
        err := rows.Scan(
            &t.ID, &t.Title, &t.Game, &description,
            &t.StartDate, &t.RegistrationDeadline,
            &t.EntryFee, &t.PrizePool, &t.MaxTeams,
            &t.Status, &t.OrganizerID,
            &t.IsVIP, &t.BannerURL,
            &t.CreatedAt, &t.UpdatedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan tournament: %w", err)
        }
		if description.Valid {
			t.Description = description.String
		}
        tournaments = append(tournaments, &t)
    }

    return tournaments, nil
}

// Update - обновление турнира
func (r *TournamentRepository) Update(ctx context.Context, id int, update *models.TournamentUpdate) (*models.Tournament, error) {
    // Получаем текущий турнир
    tournament, err := r.FindByID(ctx, id)
    if err != nil {
        return nil, err
    }
    if tournament == nil {
        return nil, nil
    }

    // Применяем изменения
if update.Title != "" {
    tournament.Title = update.Title
}
if update.Game != "" {
    tournament.Game = update.Game
}
if update.Description != "" {
    tournament.Description = update.Description
}
if !update.StartDate.IsZero() {
    tournament.StartDate = update.StartDate
}
if !update.RegistrationDeadline.IsZero() {
    tournament.RegistrationDeadline = update.RegistrationDeadline
}
if update.EntryFee != nil {
    tournament.EntryFee = *update.EntryFee
}
if update.PrizePool != nil {
    tournament.PrizePool = *update.PrizePool
}
if update.MaxTeams != nil {
    tournament.MaxTeams = *update.MaxTeams
}
if update.Status != "" {
    tournament.Status = update.Status
}
if update.IsVIP != nil {
    tournament.IsVIP = *update.IsVIP
}
if update.BannerURL != nil {
    tournament.BannerURL = update.BannerURL
}
    

    query := `
        UPDATE tournaments
        SET title = $1, game = $2, description = $3, start_date = $4, registration_deadline = $5,
            entry_fee = $6, prize_pool = $7, max_teams = $8, status = $9, is_vip = $10, banner_url = $11, updated_at = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, approved_by, approved_at, is_vip, banner_url, created_at, updated_at
    `

    err = r.db.Pool.QueryRow(ctx, query,
        tournament.Title, tournament.Game, tournament.Description,
        tournament.StartDate, tournament.RegistrationDeadline,
        tournament.EntryFee, tournament.PrizePool, tournament.MaxTeams,
        tournament.Status, tournament.IsVIP, tournament.BannerURL, id,
    ).Scan(
        &tournament.ID, &tournament.Title, &tournament.Game, &tournament.Description,
        &tournament.StartDate, &tournament.RegistrationDeadline,
        &tournament.EntryFee, &tournament.PrizePool, &tournament.MaxTeams,
        &tournament.Status, &tournament.OrganizerID,
        &tournament.ApprovedBy, &tournament.ApprovedAt,
        &tournament.IsVIP, &tournament.BannerURL,
        &tournament.CreatedAt, &tournament.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to update tournament: %w", err)
    }

    return tournament, nil
}
// Delete - удаление турнира
func (r *TournamentRepository) Delete(ctx context.Context, id int) error {
    query := `DELETE FROM tournaments WHERE id = $1`

    result, err := r.db.Pool.Exec(ctx, query, id)
    if err != nil {
        return fmt.Errorf("failed to delete tournament: %w", err)
    }

    if result.RowsAffected() == 0 {
        return nil
    }

    return nil
}

// Approve - подтверждение турнира менеджером
func (r *TournamentRepository) Approve(ctx context.Context, id int, managerID int) error {
    fmt.Printf("Approve called: tournamentID=%d, managerID=%d\n", id, managerID)
    
    query := `
        UPDATE tournaments
        SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = $4
    `

    result, err := r.db.Pool.Exec(ctx, query, models.TournamentStatusApproved, managerID, id, models.TournamentStatusPending)
    if err != nil {
        fmt.Printf("SQL error: %v\n", err)
        return fmt.Errorf("failed to approve tournament: %w", err)
    }

    rowsAffected := result.RowsAffected()
    fmt.Printf("Rows affected: %d\n", rowsAffected)
    
    if rowsAffected == 0 {
        return fmt.Errorf("tournament with id %d not found or not pending", id)
    }

    return nil
}
// ListByOrganizer - список турниров организатора
func (r *TournamentRepository) ListByOrganizer(ctx context.Context, organizerID int) ([]*models.Tournament, error) {
    query := `
        SELECT id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, is_vip, banner_url, created_at, updated_at
        FROM tournaments
        WHERE organizer_id = $1
        ORDER BY start_date
    `

    rows, err := r.db.Pool.Query(ctx, query, organizerID)
    if err != nil {
        return nil, fmt.Errorf("failed to list tournaments by organizer: %w", err)
    }
    defer rows.Close()

    var tournaments []*models.Tournament
    for rows.Next() {
        var t models.Tournament
        err := rows.Scan(
            &t.ID, &t.Title, &t.Game, &t.Description,
            &t.StartDate, &t.RegistrationDeadline,
            &t.EntryFee, &t.PrizePool, &t.MaxTeams,
            &t.Status, &t.OrganizerID,
            &t.IsVIP, &t.BannerURL,
            &t.CreatedAt, &t.UpdatedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan tournament: %w", err)
        }
        tournaments = append(tournaments, &t)
    }
    return tournaments, nil
}
// CountByMonth - количество турниров по году и месяцу
func (r *TournamentRepository) CountByMonth(ctx context.Context, year int, month int) (int, error) {
    var count int
    query := `
        SELECT COUNT(*) FROM tournaments 
        WHERE EXTRACT(YEAR FROM start_date) = $1 
          AND EXTRACT(MONTH FROM start_date) = $2
    `
    err := r.db.Pool.QueryRow(ctx, query, year, month).Scan(&count)
    if err != nil {
        return 0, fmt.Errorf("failed to count tournaments by month: %w", err)
    }
    return count, nil
}

// CountByStatus - количество турниров по статусам
func (r *TournamentRepository) CountByStatus(ctx context.Context) (map[string]int, error) {
    query := `
        SELECT status, COUNT(*) FROM tournaments GROUP BY status
    `
    rows, err := r.db.Pool.Query(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("failed to count tournaments by status: %w", err)
    }
    defer rows.Close()

    result := make(map[string]int)
    for rows.Next() {
        var status string
        var count int
        if err := rows.Scan(&status, &count); err != nil {
            return nil, err
        }
        result[status] = count
    }
    return result, nil
}

// GetTopOrganizers - топ организаторов по количеству турниров
func (r *TournamentRepository) GetTopOrganizers(ctx context.Context, limit int) ([]struct {
    OrganizerID   int    `json:"organizer_id"`
    OrganizerName string `json:"organizer_name"`
    Count         int    `json:"count"`
}, error) {
    query := `
        SELECT t.organizer_id, u.username, COUNT(*) as count
        FROM tournaments t
        JOIN users u ON u.id = t.organizer_id
        GROUP BY t.organizer_id, u.username
        ORDER BY count DESC
        LIMIT $1
    `
    rows, err := r.db.Pool.Query(ctx, query, limit)
    if err != nil {
        return nil, fmt.Errorf("failed to get top organizers: %w", err)
    }
    defer rows.Close()

    var result []struct {
        OrganizerID   int    `json:"organizer_id"`
        OrganizerName string `json:"organizer_name"`
        Count         int    `json:"count"`
    }
    for rows.Next() {
        var item struct {
            OrganizerID   int    `json:"organizer_id"`
            OrganizerName string `json:"organizer_name"`
            Count         int    `json:"count"`
        }
        if err := rows.Scan(&item.OrganizerID, &item.OrganizerName, &item.Count); err != nil {
            return nil, err
        }
        result = append(result, item)
    }
    return result, nil
}