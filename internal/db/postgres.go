package db

import (
    "context"
    "fmt"
    "log"
    "esports-manager/internal/config"

    "github.com/jackc/pgx/v5/pgxpool"
)

type PostgresDB struct {
    Pool *pgxpool.Pool
}

func NewPostgresDB(cfg *config.Config) (*PostgresDB, error) {
    connString := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
    )

    pool, err := pgxpool.New(context.Background(), connString)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to database: %w", err)
    }

    err = pool.Ping(context.Background())
    if err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    log.Println("Connected to PostgreSQL")

    pdb := &PostgresDB{Pool: pool}
    if err := pdb.EnsureSupportSchema(context.Background()); err != nil {
        pool.Close()
        return nil, fmt.Errorf("support schema: %w", err)
    }

    return pdb, nil
}

func (db *PostgresDB) Close() {
    if db.Pool != nil {
        db.Pool.Close()
        log.Println("Database connection closed")
    }
}