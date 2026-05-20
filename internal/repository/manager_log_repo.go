package repository

import (
    "context"
    "fmt"
    "time"
    "esports-manager/internal/db"
)

type ManagerLogRepository struct {
    db *db.PostgresDB
}

func NewManagerLogRepository(db *db.PostgresDB) *ManagerLogRepository {
    return &ManagerLogRepository{db: db}
}

// Create - запись действия в лог
func (r *ManagerLogRepository) Create(ctx context.Context, managerID int, action, entityType string, entityID int, oldData, newData string) error {
    query := `
        INSERT INTO manager_logs (manager_id, action, entity_type, entity_id, old_data, new_data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `
    _, err := r.db.Pool.Exec(ctx, query, managerID, action, entityType, entityID, oldData, newData)
    if err != nil {
        return fmt.Errorf("failed to insert log: %w", err)
    }
    return nil
}

// List - список логов
func (r *ManagerLogRepository) List(ctx context.Context, limit, offset int) ([]map[string]interface{}, error) {
    query := `
        SELECT id, manager_id, action, entity_type, entity_id, old_data, new_data, created_at
        FROM manager_logs
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
    `
    rows, err := r.db.Pool.Query(ctx, query, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("query error: %w", err)
    }
    defer rows.Close()

    var logs []map[string]interface{}
    for rows.Next() {
        var (
            id, managerID, entityID int
            action, entityType, oldData, newData string
            createdAt time.Time
        )
        err := rows.Scan(&id, &managerID, &action, &entityType, &entityID, &oldData, &newData, &createdAt)
        if err != nil {
            return nil, fmt.Errorf("scan error: %w", err)
        }
        
        logs = append(logs, map[string]interface{}{
            "id":          id,
            "manager_id":  managerID,
            "action":      action,
            "entity_type": entityType,
            "entity_id":   entityID,
            "old_data":    oldData,
            "new_data":    newData,
            "created_at":  createdAt.String(),
        })
    }
    return logs, nil
}

// Count - общее количество логов
func (r *ManagerLogRepository) Count(ctx context.Context) (int, error) {
    var count int
    err := r.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM manager_logs").Scan(&count)
    if err != nil {
        return 0, fmt.Errorf("failed to count logs: %w", err)
    }
    return count, nil
}