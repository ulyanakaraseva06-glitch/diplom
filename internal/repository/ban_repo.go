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
    existing, err := r.FindActiveByUserID(ctx, ban.UserID)
    if err != nil {
        return nil, err
    }
    if existing != nil {
        return nil, fmt.Errorf("user already has an active ban")
    }

   query := `
    INSERT INTO bans (user_id, moderator_id, ban_type, reason, comment, expires_at, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, user_id, moderator_id, ban_type, reason, comment, banned_at, expires_at, is_active
`

    var newBan models.Ban
    err = r.db.Pool.QueryRow(ctx, query,
        ban.UserID, moderatorID, ban.BanType, ban.Reason, ban.Comment, ban.ExpiresAt, true,
    ).Scan(
        &newBan.ID, &newBan.UserID, &newBan.ModeratorID, &newBan.BanType,
        &newBan.Reason, &newBan.Comment, &newBan.BannedAt, &newBan.ExpiresAt, &newBan.IsActive,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create ban: %w", err)
    }

    return &newBan, nil
}

// FindActiveByUserID - поиск активной блокировки пользователя
func (r *BanRepository) FindActiveByUserID(ctx context.Context, userID int) (*models.Ban, error) {
    query := `
        SELECT id, user_id, moderator_id, ban_type, reason, comment, banned_at, expires_at, is_active
        FROM bans
        WHERE user_id = $1 AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        LIMIT 1
    `

    var ban models.Ban
    err := r.db.Pool.QueryRow(ctx, query, userID).Scan(
        &ban.ID, &ban.UserID, &ban.ModeratorID, &ban.BanType,
        &ban.Reason, &ban.Comment, &ban.BannedAt, &ban.ExpiresAt, &ban.IsActive,
    )
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to find active ban: %w", err)
    }

    return &ban, nil
}

// Deactivate - деактивация блокировки
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
        SELECT b.id, b.user_id, u.username, b.moderator_id, m.username, 
               b.ban_type, b.reason, b.comment, b.banned_at, b.expires_at, b.is_active
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
        var banType string
        err := rows.Scan(
            &ban.ID, &ban.UserID, &ban.Username,
            &ban.ModeratorID, &ban.ModeratorName,
            &banType, &ban.Reason, &ban.Comment,
            &ban.BannedAt, &expiresAt, &ban.IsActive,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan ban: %w", err)
        }
        ban.BanType = models.BanType(banType)
        ban.BanTypeLabel = models.BanType(banType).Label()
        ban.ExpiresAt = expiresAt
        bans = append(bans, &ban)
    }

    return bans, nil
}
// IsUserBanned - проверка, заблокирован ли пользователь с определённым типом
func (r *BanRepository) IsUserBanned(ctx context.Context, userID int, banType models.BanType) (bool, error) {
    query := `
        SELECT EXISTS(
            SELECT 1 FROM bans
            WHERE user_id = $1 
              AND is_active = TRUE 
              AND ban_type = $2
              AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        )
    `
    var exists bool
    err := r.db.Pool.QueryRow(ctx, query, userID, banType).Scan(&exists)
    if err != nil {
        return false, fmt.Errorf("failed to check ban: %w", err)
    }
    return exists, nil
}

// GetActiveBanByUser - получить активную блокировку пользователя (с типом)
func (r *BanRepository) GetActiveBanByUser(ctx context.Context, userID int) (*models.Ban, error) {
    query := `
        SELECT id, user_id, moderator_id, ban_type, reason, comment, banned_at, expires_at, is_active
        FROM bans
        WHERE user_id = $1 AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        LIMIT 1
    `

    var ban models.Ban
    err := r.db.Pool.QueryRow(ctx, query, userID).Scan(
        &ban.ID, &ban.UserID, &ban.ModeratorID, &ban.BanType,
        &ban.Reason, &ban.Comment, &ban.BannedAt, &ban.ExpiresAt, &ban.IsActive,
    )
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to get active ban: %w", err)
    }
    return &ban, nil
}