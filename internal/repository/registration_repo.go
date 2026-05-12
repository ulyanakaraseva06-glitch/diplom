package repository

import (
    "context"
    "fmt"
    "esports-manager/internal/db"
    "esports-manager/internal/models"

    "github.com/jackc/pgx/v5"
)

type RegistrationRepository struct {
    db *db.PostgresDB
}

func NewRegistrationRepository(db *db.PostgresDB) *RegistrationRepository {
    return &RegistrationRepository{db: db}
}

// Create - создание заявки на турнир
func (r *RegistrationRepository) Create(ctx context.Context, tournamentID, userID int, teamName string) (*models.TournamentRegistration, error) {
    // Проверяем, не зарегистрирован ли уже пользователь
    existing, err := r.FindByTournamentAndUser(ctx, tournamentID, userID)
    if err != nil {
        return nil, err
    }
    if existing != nil {
        return nil, fmt.Errorf("user already registered for this tournament")
    }

    query := `
        INSERT INTO tournament_registrations (tournament_id, user_id, team_name, status, payment_status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, tournament_id, user_id, team_name, status, payment_status, registered_at
    `

    var registration models.TournamentRegistration
    err = r.db.Pool.QueryRow(ctx, query,
        tournamentID, userID, teamName,
        models.RegistrationStatusPending, models.PaymentStatusPending,
    ).Scan(
        &registration.ID, &registration.TournamentID, &registration.UserID,
        &registration.TeamName, &registration.Status, &registration.PaymentStatus,
        &registration.RegisteredAt,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create registration: %w", err)
    }

    return &registration, nil
}

// FindByID - поиск заявки по ID
func (r *RegistrationRepository) FindByID(ctx context.Context, id int) (*models.TournamentRegistration, error) {
    query := `
        SELECT id, tournament_id, user_id, team_name, status, payment_status, registered_at, approved_by, approved_at
        FROM tournament_registrations
        WHERE id = $1
    `

    var registration models.TournamentRegistration
    err := r.db.Pool.QueryRow(ctx, query, id).Scan(
        &registration.ID, &registration.TournamentID, &registration.UserID,
        &registration.TeamName, &registration.Status, &registration.PaymentStatus,
        &registration.RegisteredAt, &registration.ApprovedBy, &registration.ApprovedAt,
    )
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to find registration: %w", err)
    }

    return &registration, nil
}

// FindByTournamentAndUser - поиск заявки по турниру и пользователю
func (r *RegistrationRepository) FindByTournamentAndUser(ctx context.Context, tournamentID, userID int) (*models.TournamentRegistration, error) {
    query := `
        SELECT id, tournament_id, user_id, team_name, status, payment_status, registered_at, approved_by, approved_at
        FROM tournament_registrations
        WHERE tournament_id = $1 AND user_id = $2
    `

    var registration models.TournamentRegistration
    err := r.db.Pool.QueryRow(ctx, query, tournamentID, userID).Scan(
        &registration.ID, &registration.TournamentID, &registration.UserID,
        &registration.TeamName, &registration.Status, &registration.PaymentStatus,
        &registration.RegisteredAt, &registration.ApprovedBy, &registration.ApprovedAt,
    )
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to find registration: %w", err)
    }

    return &registration, nil
}

// ListByTournament - список заявок на турнир
func (r *RegistrationRepository) ListByTournament(ctx context.Context, tournamentID int, status models.RegistrationStatus, limit, offset int) ([]*models.TournamentRegistration, error) {
    query := `
        SELECT id, tournament_id, user_id, team_name, status, payment_status, registered_at, approved_by, approved_at
        FROM tournament_registrations
        WHERE tournament_id = $1 AND ($2 = '' OR status = $2)
        ORDER BY registered_at
        LIMIT $3 OFFSET $4
    `

    rows, err := r.db.Pool.Query(ctx, query, tournamentID, status, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("failed to list registrations: %w", err)
    }
    defer rows.Close()

    var registrations []*models.TournamentRegistration
    for rows.Next() {
        var r models.TournamentRegistration
        err := rows.Scan(
            &r.ID, &r.TournamentID, &r.UserID,
            &r.TeamName, &r.Status, &r.PaymentStatus,
            &r.RegisteredAt, &r.ApprovedBy, &r.ApprovedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan registration: %w", err)
        }
        registrations = append(registrations, &r)
    }

    return registrations, nil
}

// Approve - подтверждение заявки
func (r *RegistrationRepository) Approve(ctx context.Context, id int, managerID int) error {
    query := `
        UPDATE tournament_registrations
        SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = $4
    `

    result, err := r.db.Pool.Exec(ctx, query, models.RegistrationStatusApproved, managerID, id, models.RegistrationStatusPending)
    if err != nil {
        return fmt.Errorf("failed to approve registration: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("registration with id %d not found or not pending", id)
    }

    return nil
}

// Reject - отклонение заявки
func (r *RegistrationRepository) Reject(ctx context.Context, id int, managerID int) error {
    query := `
        UPDATE tournament_registrations
        SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = $4
    `

    result, err := r.db.Pool.Exec(ctx, query, models.RegistrationStatusRejected, managerID, id, models.RegistrationStatusPending)
    if err != nil {
        return fmt.Errorf("failed to reject registration: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("registration with id %d not found or not pending", id)
    }

    return nil
}

// UpdatePaymentStatus - обновление статуса оплаты
func (r *RegistrationRepository) UpdatePaymentStatus(ctx context.Context, id int, status models.PaymentStatus) error {
    query := `
        UPDATE tournament_registrations
        SET payment_status = $1
        WHERE id = $2
    `

    result, err := r.db.Pool.Exec(ctx, query, status, id)
    if err != nil {
        return fmt.Errorf("failed to update payment status: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("registration with id %d not found", id)
    }

    return nil
}

// CountByTournament - количество заявок на турнир
func (r *RegistrationRepository) CountByTournament(ctx context.Context, tournamentID int) (int, error) {
    query := `
        SELECT COUNT(*)
        FROM tournament_registrations
        WHERE tournament_id = $1
    `

    var count int
    err := r.db.Pool.QueryRow(ctx, query, tournamentID).Scan(&count)
    if err != nil {
        return 0, fmt.Errorf("failed to count registrations: %w", err)
    }

    return count, nil
}

// GetApprovedByTournament - список подтверждённых заявок на турнир
func (r *RegistrationRepository) GetApprovedByTournament(ctx context.Context, tournamentID int) ([]*models.TournamentRegistration, error) {
    query := `
        SELECT id, tournament_id, user_id, team_name, status, payment_status, registered_at, approved_by, approved_at
        FROM tournament_registrations
        WHERE tournament_id = $1 AND status = $2
        ORDER BY registered_at
    `

    rows, err := r.db.Pool.Query(ctx, query, tournamentID, models.RegistrationStatusApproved)
    if err != nil {
        return nil, fmt.Errorf("failed to get approved registrations: %w", err)
    }
    defer rows.Close()

    var registrations []*models.TournamentRegistration
    for rows.Next() {
        var reg models.TournamentRegistration
        err := rows.Scan(
            &reg.ID, &reg.TournamentID, &reg.UserID,
            &reg.TeamName, &reg.Status, &reg.PaymentStatus,
            &reg.RegisteredAt, &reg.ApprovedBy, &reg.ApprovedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan registration: %w", err)
        }
        registrations = append(registrations, &reg)
    }

    return registrations, nil
}