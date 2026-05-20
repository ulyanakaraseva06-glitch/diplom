package repository

import (
    "context"
    "fmt"
    "time"
    "esports-manager/internal/db"
    "esports-manager/internal/models"
)

type CalendarRepository struct {
    db *db.PostgresDB
}

func NewCalendarRepository(db *db.PostgresDB) *CalendarRepository {
    return &CalendarRepository{db: db}
}

// Create - создание события
func (r *CalendarRepository) Create(ctx context.Context, event *models.CalendarEvent) (*models.CalendarEvent, error) {
    query := `
        INSERT INTO calendar_events (user_id, title, description, start_date, end_date, all_day, event_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at, updated_at
    `

    err := r.db.Pool.QueryRow(ctx, query, event.UserID, event.Title, event.Description,
        event.StartDate, event.EndDate, event.AllDay, event.EventType).Scan(
        &event.ID, &event.CreatedAt, &event.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create calendar event: %w", err)
    }
    return event, nil
}

// GetByUserID - получение всех событий пользователя
func (r *CalendarRepository) GetByUserID(ctx context.Context, userID int, startDate, endDate *time.Time) ([]*models.CalendarEvent, error) {
    query := `
        SELECT id, user_id, title, description, start_date, end_date, all_day, event_type, created_at, updated_at
        FROM calendar_events
        WHERE user_id = $1
    `
    args := []interface{}{userID}

    if startDate != nil {
        query += " AND start_date >= $" + fmt.Sprintf("%d", len(args)+1)
        args = append(args, startDate)
    }
    if endDate != nil {
        query += " AND start_date <= $" + fmt.Sprintf("%d", len(args)+1)
        args = append(args, endDate)
    }
    query += " ORDER BY start_date ASC"

    rows, err := r.db.Pool.Query(ctx, query, args...)
    if err != nil {
        return nil, fmt.Errorf("failed to get calendar events: %w", err)
    }
    defer rows.Close()

    var events []*models.CalendarEvent
    for rows.Next() {
        var e models.CalendarEvent
        err := rows.Scan(&e.ID, &e.UserID, &e.Title, &e.Description, &e.StartDate, &e.EndDate,
            &e.AllDay, &e.EventType, &e.CreatedAt, &e.UpdatedAt)
        if err != nil {
            return nil, fmt.Errorf("failed to scan event: %w", err)
        }
        events = append(events, &e)
    }
    return events, nil
}

// Update - обновление события
func (r *CalendarRepository) Update(ctx context.Context, id, userID int, event *models.CalendarEvent) (*models.CalendarEvent, error) {
    query := `
        UPDATE calendar_events
        SET title = $1, description = $2, start_date = $3, end_date = $4, all_day = $5, event_type = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 AND user_id = $8
        RETURNING updated_at
    `

    err := r.db.Pool.QueryRow(ctx, query, event.Title, event.Description, event.StartDate,
        event.EndDate, event.AllDay, event.EventType, id, userID).Scan(&event.UpdatedAt)
    if err != nil {
        return nil, fmt.Errorf("failed to update calendar event: %w", err)
    }
    event.ID = id
    event.UserID = userID
    return event, nil
}

// Delete - удаление события
func (r *CalendarRepository) Delete(ctx context.Context, id, userID int) error {
    query := `DELETE FROM calendar_events WHERE id = $1 AND user_id = $2`

    result, err := r.db.Pool.Exec(ctx, query, id, userID)
    if err != nil {
        return fmt.Errorf("failed to delete calendar event: %w", err)
    }
    if result.RowsAffected() == 0 {
        return fmt.Errorf("event not found")
    }
    return nil
}