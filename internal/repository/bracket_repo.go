package repository

import (
    "context"
    "fmt"
    "esports-manager/internal/db"
)

type BracketRepository struct {
    db *db.PostgresDB
}

func NewBracketRepository(db *db.PostgresDB) *BracketRepository {
    return &BracketRepository{db: db}
}

// BracketMatch - структура для хранения матча в БД
type BracketMatch struct {
    ID           int     `json:"id"`
    TournamentID int     `json:"tournament_id"`
    MatchID      string  `json:"match_id"`
    Team1ID      *int    `json:"team1_id"`
    Team2ID      *int    `json:"team2_id"`
    WinnerID     *int    `json:"winner_id"`
    NextMatchID  string  `json:"next_match_id"`
    RoundNumber  int     `json:"round_number"`
    Position     int     `json:"position"`
}

// SaveBracket - сохранение всей сетки турнира
func (r *BracketRepository) SaveBracket(ctx context.Context, tournamentID int, matches []BracketMatch, championID *int) error {
    // Начинаем транзакцию
    tx, err := r.db.Pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback(ctx)

    // Удаляем старые записи
    _, err = tx.Exec(ctx, "DELETE FROM tournament_brackets WHERE tournament_id = $1", tournamentID)
    if err != nil {
        return fmt.Errorf("failed to delete old brackets: %w", err)
    }

    // Вставляем новые матчи
    for _, match := range matches {
        _, err = tx.Exec(ctx, `
            INSERT INTO tournament_brackets 
            (tournament_id, match_id, team1_id, team2_id, winner_id, next_match_id, round_number, position)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, tournamentID, match.MatchID, match.Team1ID, match.Team2ID, match.WinnerID,
            match.NextMatchID, match.RoundNumber, match.Position)
        if err != nil {
            return fmt.Errorf("failed to insert match: %w", err)
        }
    }

    // Обновляем чемпиона
    _, err = tx.Exec(ctx, `
        INSERT INTO tournament_champions (tournament_id, champion_id)
        VALUES ($1, $2)
        ON CONFLICT (tournament_id) DO UPDATE SET champion_id = $2, updated_at = CURRENT_TIMESTAMP
    `, tournamentID, championID)
    if err != nil {
        return fmt.Errorf("failed to save champion: %w", err)
    }

    // Фиксируем транзакцию
    if err := tx.Commit(ctx); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }

    return nil
}

// LoadBracket - загрузка сетки турнира
func (r *BracketRepository) LoadBracket(ctx context.Context, tournamentID int) ([]BracketMatch, *int, error) {
    // Загружаем матчи
    rows, err := r.db.Pool.Query(ctx, `
        SELECT match_id, team1_id, team2_id, winner_id, next_match_id, round_number, position
        FROM tournament_brackets
        WHERE tournament_id = $1
        ORDER BY round_number, position
    `, tournamentID)
    if err != nil {
        return nil, nil, fmt.Errorf("failed to load brackets: %w", err)
    }
    defer rows.Close()

    var matches []BracketMatch
    for rows.Next() {
        var match BracketMatch
        err := rows.Scan(&match.MatchID, &match.Team1ID, &match.Team2ID, &match.WinnerID,
            &match.NextMatchID, &match.RoundNumber, &match.Position)
        if err != nil {
            return nil, nil, fmt.Errorf("failed to scan match: %w", err)
        }
        match.TournamentID = tournamentID
        matches = append(matches, match)
    }

    // Загружаем чемпиона
    var championID *int
    err = r.db.Pool.QueryRow(ctx, `
        SELECT champion_id FROM tournament_champions WHERE tournament_id = $1
    `, tournamentID).Scan(&championID)
    if err != nil {
        // Нет чемпиона - не ошибка
        championID = nil
    }

    return matches, championID, nil
}