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
        INSERT INTO support_messages (user_id, manager_id, message, image_url, is_from_user, is_read)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
    `

    err := r.db.Pool.QueryRow(ctx, query, msg.UserID, msg.ManagerID, msg.Message, msg.ImageURL, msg.IsFromUser, msg.IsRead).Scan(
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
        SELECT id, user_id, manager_id, message, image_url, is_from_user, is_read, created_at
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
    &msg.ID, &msg.UserID, &msg.ManagerID, &msg.Message, &msg.ImageURL,
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

// ActiveChatUser - пользователь с активным чатом и количеством непрочитанных
type ActiveChatUser struct {
    ID          int    `json:"id"`
    Username    string `json:"username"`
    Email       string `json:"email"`
    UnreadCount int    `json:"unread_count"`
}

// GetUsersWithActiveChats - список пользователей, у которых есть сообщения в поддержку
func (r *SupportRepository) GetUsersWithActiveChats(ctx context.Context) ([]ActiveChatUser, error) {
    query := `
        SELECT 
            u.id, 
            u.username, 
            u.email,
            COALESCE(
                (SELECT COUNT(*) 
                 FROM support_messages sm 
                 WHERE sm.user_id = u.id 
                   AND sm.is_from_user = true 
                   AND sm.is_read = false), 0
            ) as unread_count
        FROM users u
        WHERE EXISTS (
            SELECT 1 FROM support_messages sm2 WHERE sm2.user_id = u.id
        )
        AND u.role = 'user'
        ORDER BY unread_count DESC, u.username
    `

    rows, err := r.db.Pool.Query(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("failed to get users with active chats: %w", err)
    }
    defer rows.Close()

    var result []ActiveChatUser
    for rows.Next() {
        var chat ActiveChatUser
        if err := rows.Scan(&chat.ID, &chat.Username, &chat.Email, &chat.UnreadCount); err != nil {
            return nil, fmt.Errorf("failed to scan active chat user: %w", err)
        }
        result = append(result, chat)
    }
    return result, nil
}
// GetTotalUnreadCountForManagers - общее количество непрочитанных сообщений от пользователей
func (r *SupportRepository) GetTotalUnreadCountForManagers(ctx context.Context) (int, error) {
    var count int
    err := r.db.Pool.QueryRow(ctx, `
        SELECT COUNT(*) FROM support_messages 
        WHERE is_from_user = true AND is_read = false
    `).Scan(&count)
    if err != nil {
        return 0, fmt.Errorf("failed to get total unread count: %w", err)
    }
    return count, nil
}