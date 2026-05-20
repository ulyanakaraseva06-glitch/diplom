package neo4j

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type Neo4jClient struct {
	Driver   neo4j.DriverWithContext
	Database string
}

type Recommendation struct {
	UserID        string  `json:"user_id"`
	Nickname      string  `json:"nickname"`
	MMR           int64   `json:"mmr"`
	Role          string  `json:"role"`
	CommonGames   int64   `json:"common_games"`
	MutualFriends int64   `json:"mutual_friends"`
	Score         float64 `json:"score"`
}

func NewNeo4jClient(uri, username, password, database string) (*Neo4jClient, error) {
	driver, err := neo4j.NewDriverWithContext(
		uri,
		neo4j.BasicAuth(username, password, ""),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Neo4j driver: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = driver.VerifyConnectivity(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Neo4j: %w", err)
	}

	log.Println("Connected to Neo4j")
	return &Neo4jClient{Driver: driver, Database: database}, nil
}

func (c *Neo4jClient) Close() {
	if c.Driver != nil {
		c.Driver.Close(context.Background())
		log.Println("Neo4j connection closed")
	}
}

// CreateUserNode - создание узла пользователя в Neo4j
func (c *Neo4jClient) CreateUserNode(ctx context.Context, userID int, nickname, email, city, role string, mmr int) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		query := `
            MERGE (u:User {id: $id})
            SET u.nickname = $nickname,
                u.email = $email,
                u.city = $city,
                u.role = $role,
                u.mmr = $mmr,
                u.registered_at = datetime()
            RETURN u
        `
		result, err := tx.Run(ctx, query, map[string]any{
			"id":       fmt.Sprintf("user_%03d", userID),
			"nickname": nickname,
			"email":    email,
			"city":     city,
			"role":     role,
			"mmr":      mmr,
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})

	return err
}

// UpdateUserGameInterest - добавление интереса к игре
func (c *Neo4jClient) UpdateUserGameInterest(ctx context.Context, userID int, gameName string, level string) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		query := `
            MERGE (g:Game {name: $gameName})
            ON CREATE SET g.created_at = datetime()
            WITH g
            MATCH (u:User {id: $userId})
            MERGE (u)-[r:INTERESTED_IN]->(g)
            SET r.level = $level,
                r.updated_at = datetime()
            RETURN u, g
        `
		result, err := tx.Run(ctx, query, map[string]any{
			"userId":   fmt.Sprintf("user_%03d", userID),
			"gameName": gameName,
			"level":    level,
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})

	return err
}

// CreateFriendship - создание связи дружбы
func (c *Neo4jClient) CreateFriendship(ctx context.Context, userID1, userID2 int) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		query := `
            MATCH (u1:User {id: $userId1})
            MATCH (u2:User {id: $userId2})
            MERGE (u1)-[r:FRIEND]->(u2)
            SET r.since = datetime(),
                r.weight = 0.7
            MERGE (u2)-[r2:FRIEND]->(u1)
            SET r2.since = datetime(),
                r2.weight = 0.7
            RETURN u1, u2
        `
		result, err := tx.Run(ctx, query, map[string]any{
			"userId1": fmt.Sprintf("user_%03d", userID1),
			"userId2": fmt.Sprintf("user_%03d", userID2),
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})

	return err
}

// UpdatePlayedWith - обновление связи совместных игр
func (c *Neo4jClient) UpdatePlayedWith(ctx context.Context, userID1, userID2 int, incrementGames int) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		query := `
            MATCH (u1:User {id: $userId1})
            MATCH (u2:User {id: $userId2})
            MERGE (u1)-[r:PLAYED_WITH]->(u2)
            ON CREATE SET r.count = $increment, r.last_played = datetime()
            ON MATCH SET r.count = r.count + $increment, r.last_played = datetime()
            SET r.weight = r.count * 0.5
            RETURN u1, u2
        `
		result, err := tx.Run(ctx, query, map[string]any{
			"userId1":   fmt.Sprintf("user_%03d", userID1),
			"userId2":   fmt.Sprintf("user_%03d", userID2),
			"increment": incrementGames,
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})

	return err
}

// GetRecommendations - получение рекомендаций союзников
func (c *Neo4jClient) GetRecommendations(ctx context.Context, userID int, limit int) ([]Recommendation, error) {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{
		DatabaseName: c.Database,
	})
	defer session.Close(ctx)

	query := `
        MATCH (u:User {id: $userId})
        MATCH (candidate:User)
        WHERE candidate <> u
          AND (u)-[:INTERESTED_IN]-(:Game)-[:INTERESTED_IN]-(candidate)

        RETURN candidate.id AS user_id,
               candidate.nickname AS nickname,
               COALESCE(candidate.mmr, 1500) AS mmr,
               COALESCE(candidate.role, 'carry') AS role,
               0 AS common_games,
               0 AS mutual_friends,
               (COALESCE(candidate.mmr, 1500) / 100.0) AS score

        ORDER BY score DESC
        LIMIT $limit
    `

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {

		records, err := tx.Run(ctx, query, map[string]any{
			"userId": fmt.Sprintf("user_%03d", userID),
			"limit":  limit,
		})

		if err != nil {
			return nil, err
		}

		var recommendations []Recommendation

		for records.Next(ctx) {
			record := records.Record()

			rec := Recommendation{
				UserID:        toString(record.Values[0]),
				Nickname:      toString(record.Values[1]),
				MMR:           toInt64(record.Values[2]),
				Role:          toString(record.Values[3]),
				CommonGames:   toInt64(record.Values[4]),
				MutualFriends: toInt64(record.Values[5]),
				Score:         toFloat64(record.Values[6]),
			}

			recommendations = append(recommendations, rec)
		}

		if err := records.Err(); err != nil {
			return nil, err
		}

		return recommendations, nil
	})

	if err != nil {
		return nil, err
	}

	return result.([]Recommendation), nil
}

func toString(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func toInt64(v any) int64 {
	switch val := v.(type) {
	case int64:
		return val
	case int:
		return int64(val)
	case float64:
		return int64(val)
	}
	return 0
}

func toFloat64(v any) float64 {
	if f, ok := v.(float64); ok {
		return f
	}
	return 0
}
