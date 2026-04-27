package repository

import (
    "context"
    "fmt"
    "esports-manager/internal/db"
    "esports-manager/internal/models"

  
)

type SupportRepository struct {
    db *db.PostgresDB
}

func NewSupportRepository(db *db.PostgresDB) *SupportRepository {
    return &SupportRepository{db: db}
}

// Create - создание сообщения
func (r *SupportRepository) Create(ctx context.Context, msg *models.SupportMessage) error {
    query := `
        INSERT INTO support_messages (user_id, manager_id, message, is_from_user, is_read)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
    `

    err := r.db.Pool.QueryRow(ctx, query, msg.UserID, msg.ManagerID, msg.Message, msg.IsFromUser, msg.IsRead).Scan(
        &msg.ID, &msg.CreatedAt,
    )
    if err != nil {
        return fmt.Errorf("failed to create support message: %w", err)
    }

    return nil
}

// GetMessages - получение истории сообщений для пользователя
func (r *SupportRepository) GetMessages(ctx context.Context, userID int, limit, offset int) ([]*models.SupportMessage, error) {
    query := `
        SELECT id, user_id, manager_id, message, is_from_user, is_read, created_at
        FROM support_messages
        WHERE user_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
    `

    rows, err := r.db.Pool.Query(ctx, query, userID, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("failed to get support messages: %w", err)
    }
    defer rows.Close()

    var messages []*models.SupportMessage
    for rows.Next() {
        var msg models.SupportMessage
        err := rows.Scan(
            &msg.ID, &msg.UserID, &msg.ManagerID, &msg.Message,
            &msg.IsFromUser, &msg.IsRead, &msg.CreatedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan message: %w", err)
        }
        messages = append(messages, &msg)
    }

    return messages, nil
}

// GetUnreadCount - количество непрочитанных сообщений для пользователя
func (r *SupportRepository) GetUnreadCount(ctx context.Context, userID int) (int, error) {
    query := `
        SELECT COUNT(*)
        FROM support_messages
        WHERE user_id = $1 AND is_read = FALSE
    `

    var count int
    err := r.db.Pool.QueryRow(ctx, query, userID).Scan(&count)
    if err != nil {
        return 0, fmt.Errorf("failed to get unread count: %w", err)
    }

    return count, nil
}

// MarkAsRead - отметить все сообщения пользователя как прочитанные
func (r *SupportRepository) MarkAsRead(ctx context.Context, userID int) error {
    query := `
        UPDATE support_messages
        SET is_read = TRUE
        WHERE user_id = $1 AND is_read = FALSE
    `

    _, err := r.db.Pool.Exec(ctx, query, userID)
    if err != nil {
        return fmt.Errorf("failed to mark messages as read: %w", err)
    }

    return nil
}