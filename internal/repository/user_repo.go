package repository

import (
    "context"
    "errors"
    "fmt"

    "esports-manager/internal/db"
    "esports-manager/internal/models"

    "github.com/jackc/pgx/v5"
)

type UserRepository struct {
    db *db.PostgresDB
}

func NewUserRepository(db *db.PostgresDB) *UserRepository {
    return &UserRepository{db: db}
}

// Create - создание нового пользователя
func (r *UserRepository) Create(ctx context.Context, email, passwordHash, username string, role models.UserRole) (*models.User, error) {
    query := `
        INSERT INTO users (email, password_hash, username, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, username, role, created_at, updated_at
    `

    var user models.User
    err := r.db.Pool.QueryRow(ctx, query, email, passwordHash, username, role).Scan(
        &user.ID, &user.Email, &user.Username, &user.Role, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    user.PasswordHash = passwordHash
    return &user, nil
}

// FindByEmail - поиск пользователя по email
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
    query := `
        SELECT id, email, password_hash, username, role, created_at, updated_at
        FROM users
        WHERE email = $1
    `

    var user models.User
    err := r.db.Pool.QueryRow(ctx, query, email).Scan(
        &user.ID, &user.Email, &user.PasswordHash, &user.Username, &user.Role, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to find user by email: %w", err)
    }

    return &user, nil
}

// FindByID - поиск пользователя по ID
func (r *UserRepository) FindByID(ctx context.Context, id int) (*models.User, error) {
    query := `
        SELECT id, email, password_hash, username, role, created_at, updated_at
        FROM users
        WHERE id = $1
    `

    var user models.User
    err := r.db.Pool.QueryRow(ctx, query, id).Scan(
        &user.ID, &user.Email, &user.PasswordHash, &user.Username, &user.Role, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to find user by id: %w", err)
    }

    return &user, nil
}

// ListPlayers - игроки (role=user) с поиском по никнейму
func (r *UserRepository) ListPlayers(ctx context.Context, search string, excludeID, limit int) ([]*models.User, error) {
    query := `
        SELECT id, email, username, role, created_at, updated_at
        FROM users
        WHERE role = $1 AND id != $2
    `
    args := []interface{}{models.RoleUser, excludeID}

    if search != "" {
        query += ` AND username ILIKE $3`
        args = append(args, "%"+search+"%")
    }
    query += ` ORDER BY username LIMIT $` + fmt.Sprintf("%d", len(args)+1)
    args = append(args, limit)

    rows, err := r.db.Pool.Query(ctx, query, args...)
    if err != nil {
        return nil, fmt.Errorf("failed to list players: %w", err)
    }
    defer rows.Close()

    var users []*models.User
    for rows.Next() {
        var u models.User
        if err := rows.Scan(&u.ID, &u.Email, &u.Username, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
            return nil, fmt.Errorf("failed to scan user: %w", err)
        }
        users = append(users, &u)
    }
    return users, nil
}

// List - список пользователей с пагинацией
func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*models.User, error) {
    query := `
        SELECT id, email, username, role, created_at, updated_at
        FROM users
        ORDER BY id
        LIMIT $1 OFFSET $2
    `

    rows, err := r.db.Pool.Query(ctx, query, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("failed to list users: %w", err)
    }
    defer rows.Close()

    var users []*models.User
    for rows.Next() {
        var user models.User
        err := rows.Scan(&user.ID, &user.Email, &user.Username, &user.Role, &user.CreatedAt, &user.UpdatedAt)
        if err != nil {
            return nil, fmt.Errorf("failed to scan user: %w", err)
        }
        users = append(users, &user)
    }

    return users, nil
}

// UpdateRole - обновление роли пользователя
func (r *UserRepository) UpdateRole(ctx context.Context, userID int, role models.UserRole) error {
    query := `
        UPDATE users
        SET role = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    `

    result, err := r.db.Pool.Exec(ctx, query, role, userID)
    if err != nil {
        return fmt.Errorf("failed to update user role: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("user with id %d not found", userID)
    }

    return nil
}
// UpdateUsername - обновление имени пользователя
func (r *UserRepository) UpdateUsername(ctx context.Context, userID int, username string) error {
    query := `
        UPDATE users
        SET username = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    `

    result, err := r.db.Pool.Exec(ctx, query, username, userID)
    if err != nil {
        return fmt.Errorf("failed to update username: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("user with id %d not found", userID)
    }

    return nil
}