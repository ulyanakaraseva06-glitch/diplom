package db

import (
	"context"
	"log"
)

// EnsureSupportSchema создаёт таблицу support_messages и колонку image_url при старте.
func (db *PostgresDB) EnsureSupportSchema(ctx context.Context) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS support_messages (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
			message TEXT NOT NULL DEFAULT '',
			is_from_user BOOLEAN NOT NULL DEFAULT TRUE,
			is_read BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT ''`,
		`CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at)`,
	}

	for _, q := range queries {
		if _, err := db.Pool.Exec(ctx, q); err != nil {
			return err
		}
	}
	log.Println("Support messages schema ready")
	return nil
}
