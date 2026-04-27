package repository

import (
    "context"
    "fmt"
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
        INSERT INTO tournaments (title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, created_at, updated_at
    `

    var newTournament models.Tournament
    err := r.db.Pool.QueryRow(ctx, query,
        tournament.Title, tournament.Game, tournament.Description,
        tournament.StartDate, tournament.RegistrationDeadline,
        tournament.EntryFee, tournament.PrizePool, tournament.MaxTeams,
        models.TournamentStatusPending, organizerID,
    ).Scan(
        &newTournament.ID, &newTournament.Title, &newTournament.Game, &newTournament.Description,
        &newTournament.StartDate, &newTournament.RegistrationDeadline,
        &newTournament.EntryFee, &newTournament.PrizePool, &newTournament.MaxTeams,
        &newTournament.Status, &newTournament.OrganizerID,
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
        SELECT id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, approved_by, approved_at, created_at, updated_at
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

// List - список турниров с фильтрацией и пагинацией
func (r *TournamentRepository) List(ctx context.Context, game string, status models.TournamentStatus, limit, offset int) ([]*models.Tournament, error) {
    query := `
        SELECT id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, created_at, updated_at
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
    for rows.Next() {
        var t models.Tournament
        err := rows.Scan(
            &t.ID, &t.Title, &t.Game, &t.Description,
            &t.StartDate, &t.RegistrationDeadline,
            &t.EntryFee, &t.PrizePool, &t.MaxTeams,
            &t.Status, &t.OrganizerID,
            &t.CreatedAt, &t.UpdatedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan tournament: %w", err)
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

    query := `
        UPDATE tournaments
        SET title = $1, game = $2, description = $3, start_date = $4, registration_deadline = $5,
            entry_fee = $6, prize_pool = $7, max_teams = $8, status = $9, updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING id, title, game, description, start_date, registration_deadline, entry_fee, prize_pool, max_teams, status, organizer_id, approved_by, approved_at, created_at, updated_at
    `

    err = r.db.Pool.QueryRow(ctx, query,
        tournament.Title, tournament.Game, tournament.Description,
        tournament.StartDate, tournament.RegistrationDeadline,
        tournament.EntryFee, tournament.PrizePool, tournament.MaxTeams,
        tournament.Status, id,
    ).Scan(
        &tournament.ID, &tournament.Title, &tournament.Game, &tournament.Description,
        &tournament.StartDate, &tournament.RegistrationDeadline,
        &tournament.EntryFee, &tournament.PrizePool, &tournament.MaxTeams,
        &tournament.Status, &tournament.OrganizerID,
        &tournament.ApprovedBy, &tournament.ApprovedAt,
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
    query := `
        UPDATE tournaments
        SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = $4
    `

    result, err := r.db.Pool.Exec(ctx, query, models.TournamentStatusApproved, managerID, id, models.TournamentStatusPending)
    if err != nil {
        return fmt.Errorf("failed to approve tournament: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("tournament with id %d not found or not pending", id)
    }

    return nil
}