package repository

import (
    "context"
    "fmt"
    "time"
    "esports-manager/internal/db"
    "esports-manager/internal/models"

    "github.com/jackc/pgx/v5"
)

type BanRepository struct {
    db *db.PostgresDB
}

func NewBanRepository(db *db.PostgresDB) *BanRepository {
    return &BanRepository{db: db}
}

// Create - создание блокировки
func (r *BanRepository) Create(ctx context.Context, ban *models.BanRequest, moderatorID int) (*models.Ban, error) {
    // Проверяем, есть ли активная блокировка
    existing, err := r.FindActiveByUserID(ctx, ban.UserID)
    if err != nil {
        return nil, err
    }
    if existing != nil {
        return nil, fmt.Errorf("user already has an active ban")
    }

    query := `
        INSERT INTO bans (user_id, moderator_id, reason, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, moderator_id, reason, banned_at, expires_at, is_active
    `

    var newBan models.Ban
    err = r.db.Pool.QueryRow(ctx, query, ban.UserID, moderatorID, ban.Reason, ban.ExpiresAt, true).Scan(
        &newBan.ID, &newBan.UserID, &newBan.ModeratorID, &newBan.Reason,
        &newBan.BannedAt, &newBan.ExpiresAt, &newBan.IsActive,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create ban: %w", err)
    }

    return &newBan, nil
}

// FindActiveByUserID - поиск активной блокировки пользователя
func (r *BanRepository) FindActiveByUserID(ctx context.Context, userID int) (*models.Ban, error) {
    query := `
        SELECT id, user_id, moderator_id, reason, banned_at, expires_at, is_active
        FROM bans
        WHERE user_id = $1 AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        LIMIT 1
    `

    var ban models.Ban
    err := r.db.Pool.QueryRow(ctx, query, userID).Scan(
        &ban.ID, &ban.UserID, &ban.ModeratorID, &ban.Reason,
        &ban.BannedAt, &ban.ExpiresAt, &ban.IsActive,
    )
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to find active ban: %w", err)
    }

    return &ban, nil
}

// Deactivate - деактивация блокировки (разблокировка)
func (r *BanRepository) Deactivate(ctx context.Context, userID int) error {
    query := `
        UPDATE bans
        SET is_active = FALSE
        WHERE user_id = $1 AND is_active = TRUE
    `

    result, err := r.db.Pool.Exec(ctx, query, userID)
    if err != nil {
        return fmt.Errorf("failed to deactivate ban: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("no active ban found for user %d", userID)
    }

    return nil
}

// ListActive - список активных блокировок
func (r *BanRepository) ListActive(ctx context.Context, limit, offset int) ([]*models.BanResponse, error) {
    query := `
        SELECT b.id, b.user_id, u.username, b.moderator_id, m.username, b.reason, b.banned_at, b.expires_at, b.is_active
        FROM bans b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN users m ON b.moderator_id = m.id
        WHERE b.is_active = TRUE
          AND (b.expires_at IS NULL OR b.expires_at > CURRENT_TIMESTAMP)
        ORDER BY b.banned_at DESC
        LIMIT $1 OFFSET $2
    `

    rows, err := r.db.Pool.Query(ctx, query, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("failed to list active bans: %w", err)
    }
    defer rows.Close()

    var bans []*models.BanResponse
    for rows.Next() {
        var ban models.BanResponse
        var expiresAt *time.Time
        err := rows.Scan(
            &ban.ID, &ban.UserID, &ban.Username,
            &ban.ModeratorID, &ban.ModeratorName,
            &ban.Reason, &ban.BannedAt, &expiresAt, &ban.IsActive,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan ban: %w", err)
        }
        ban.ExpiresAt = expiresAt
        bans = append(bans, &ban)
    }

    return bans, nil
}