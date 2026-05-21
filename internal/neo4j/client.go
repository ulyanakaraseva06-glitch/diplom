package neo4j

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
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

type TeamMemberRecommendation struct {
	UserID      string  `json:"user_id"`
	Nickname    string  `json:"nickname"`
	MMR         int64   `json:"mmr"`
	Role        string  `json:"role"`
	CommonGames int64   `json:"common_games"`
	Score       float64 `json:"score"`
}

func UserNodeID(userID int) string {
	return fmt.Sprintf("user_%03d", userID)
}

// ParseUserNodeID — user_001 / user_12 → числовой id PostgreSQL.
func ParseUserNodeID(nodeID string) (int, bool) {
	nodeID = strings.TrimSpace(nodeID)
	if !strings.HasPrefix(nodeID, "user_") {
		return 0, false
	}
	n, err := strconv.Atoi(strings.TrimPrefix(nodeID, "user_"))
	return n, err == nil && n > 0
}

func NewNeo4jClient(uri, username, password, database string) (*Neo4jClient, error) {
	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(username, password, ""))
	if err != nil {
		return nil, fmt.Errorf("failed to create Neo4j driver: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := driver.VerifyConnectivity(ctx); err != nil {
		_ = driver.Close(ctx)
		return nil, fmt.Errorf("failed to connect to Neo4j: %w", err)
	}

	log.Println("Connected to Neo4j")
	return &Neo4jClient{Driver: driver, Database: database}, nil
}

func (c *Neo4jClient) Close() {
	if c.Driver != nil {
		_ = c.Driver.Close(context.Background())
		log.Println("Neo4j connection closed")
	}
}

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
			    u.updated_at = datetime()
			ON CREATE SET u.registered_at = datetime()
			RETURN u
		`
		result, err := tx.Run(ctx, query, map[string]any{
			"id": UserNodeID(userID), "nickname": nickname, "email": email,
			"city": city, "role": role, "mmr": mmr,
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})
	return err
}

func (c *Neo4jClient) ClearUserGameInterests(ctx context.Context, userID int) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		result, err := tx.Run(ctx, `
			MATCH (u:User {id: $userId})-[r:INTERESTED_IN]->(:Game)
			DELETE r
		`, map[string]any{"userId": UserNodeID(userID)})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})
	return err
}

func (c *Neo4jClient) UpdateUserGameInterest(ctx context.Context, userID int, gameName, level string) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		result, err := tx.Run(ctx, `
			MERGE (g:Game {name: $gameName})
			ON CREATE SET g.created_at = datetime()
			WITH g
			MATCH (u:User {id: $userId})
			MERGE (u)-[r:INTERESTED_IN]->(g)
			SET r.level = $level, r.updated_at = datetime()
			RETURN u, g
		`, map[string]any{
			"userId": UserNodeID(userID), "gameName": gameName, "level": level,
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})
	return err
}

func (c *Neo4jClient) CreateFriendship(ctx context.Context, userID1, userID2 int) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		result, err := tx.Run(ctx, `
			MATCH (u1:User {id: $userId1})
			MATCH (u2:User {id: $userId2})
			MERGE (u1)-[r:FRIEND]->(u2)
			SET r.since = datetime(), r.weight = 0.7
			MERGE (u2)-[r2:FRIEND]->(u1)
			SET r2.since = datetime(), r2.weight = 0.7
			RETURN u1, u2
		`, map[string]any{
			"userId1": UserNodeID(userID1), "userId2": UserNodeID(userID2),
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})
	return err
}

func (c *Neo4jClient) DeleteFriendship(ctx context.Context, userID1, userID2 int) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		result, err := tx.Run(ctx, `
			MATCH (u1:User {id: $userId1})-[r:FRIEND]-(u2:User {id: $userId2})
			DELETE r
		`, map[string]any{
			"userId1": UserNodeID(userID1), "userId2": UserNodeID(userID2),
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})
	return err
}

func (c *Neo4jClient) SyncTeam(ctx context.Context, teamID, teamName string, memberIDs []int) error {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	memberNodeIDs := make([]string, 0, len(memberIDs))
	for _, id := range memberIDs {
		memberNodeIDs = append(memberNodeIDs, UserNodeID(id))
	}

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		result, err := tx.Run(ctx, `
			MERGE (t:Team {id: $teamId})
			SET t.name = $teamName, t.updated_at = datetime()
			WITH t
			OPTIONAL MATCH (:User)-[old:MEMBER_OF]->(t)
			DELETE old
			WITH t
			UNWIND $memberIds AS memberId
			MATCH (u:User {id: memberId})
			MERGE (u)-[m:MEMBER_OF]->(t)
			SET m.since = datetime()
			RETURN t
		`, map[string]any{
			"teamId": teamID, "teamName": teamName, "memberIds": memberNodeIDs,
		})
		if err != nil {
			return nil, err
		}
		return result.Consume(ctx)
	})
	return err
}

func (c *Neo4jClient) GetFriendRecommendations(ctx context.Context, userID int, limit int) ([]Recommendation, error) {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	query := `
		MATCH (u:User {id: $userId})
		MATCH (candidate:User)
		WHERE candidate <> u AND NOT (u)-[:FRIEND]-(candidate)
		OPTIONAL MATCH (u)-[:INTERESTED_IN]-(g:Game)-[:INTERESTED_IN]-(candidate)
		WITH candidate, count(DISTINCT g) AS commonGames
		WHERE commonGames > 0
		OPTIONAL MATCH (u)-[:FRIEND]-(mutual:User)-[:FRIEND]-(candidate)
		WITH candidate, commonGames, count(DISTINCT mutual) AS mutualFriends
		RETURN candidate.id AS user_id, candidate.nickname AS nickname,
		       COALESCE(candidate.mmr, 1500) AS mmr, COALESCE(candidate.role, 'carry') AS role,
		       commonGames, mutualFriends,
		       (commonGames * 2.0 + mutualFriends * 3.0 + COALESCE(candidate.mmr, 1500) / 100.0) AS score
		ORDER BY score DESC LIMIT $limit
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		records, err := tx.Run(ctx, query, map[string]any{
			"userId": UserNodeID(userID), "limit": limit,
		})
		if err != nil {
			return nil, err
		}
		var out []Recommendation
		for records.Next(ctx) {
			rec := records.Record()
			out = append(out, Recommendation{
				UserID: toString(rec.Values[0]), Nickname: toString(rec.Values[1]),
				MMR: toInt64(rec.Values[2]), Role: toString(rec.Values[3]),
				CommonGames: toInt64(rec.Values[4]), MutualFriends: toInt64(rec.Values[5]),
				Score: toFloat64(rec.Values[6]),
			})
		}
		return out, records.Err()
	})
	if err != nil {
		return nil, err
	}
	recs, _ := result.([]Recommendation)
	return recs, nil
}

func (c *Neo4jClient) GetTeamMemberRecommendations(ctx context.Context, userID int, teamID string, limit int) ([]TeamMemberRecommendation, error) {
	session := c.Driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: c.Database})
	defer session.Close(ctx)

	params := map[string]any{"userId": UserNodeID(userID), "limit": limit}
	var query string
	if teamID != "" {
		params["teamId"] = teamID
		query = `
			MATCH (u:User {id: $userId})-[:FRIEND]-(friend:User)
			WHERE NOT (friend)-[:MEMBER_OF]->(:Team {id: $teamId})
			OPTIONAL MATCH (u)-[:INTERESTED_IN]-(g:Game)-[:INTERESTED_IN]-(friend)
			WITH friend, count(DISTINCT g) AS commonGames
			WHERE commonGames > 0
			RETURN friend.id AS user_id, friend.nickname AS nickname,
			       COALESCE(friend.mmr, 1500) AS mmr, COALESCE(friend.role, 'carry') AS role,
			       commonGames, (commonGames * 3.0 + COALESCE(friend.mmr, 1500) / 100.0) AS score
			ORDER BY score DESC LIMIT $limit
		`
	} else {
		query = `
			MATCH (u:User {id: $userId})-[:FRIEND]-(friend:User)
			OPTIONAL MATCH (u)-[:INTERESTED_IN]-(g:Game)-[:INTERESTED_IN]-(friend)
			WITH friend, count(DISTINCT g) AS commonGames
			WHERE commonGames > 0
			RETURN friend.id AS user_id, friend.nickname AS nickname,
			       COALESCE(friend.mmr, 1500) AS mmr, COALESCE(friend.role, 'carry') AS role,
			       commonGames, (commonGames * 3.0 + COALESCE(friend.mmr, 1500) / 100.0) AS score
			ORDER BY score DESC LIMIT $limit
		`
	}

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		records, err := tx.Run(ctx, query, params)
		if err != nil {
			return nil, err
		}
		var out []TeamMemberRecommendation
		for records.Next(ctx) {
			rec := records.Record()
			out = append(out, TeamMemberRecommendation{
				UserID: toString(rec.Values[0]), Nickname: toString(rec.Values[1]),
				MMR: toInt64(rec.Values[2]), Role: toString(rec.Values[3]),
				CommonGames: toInt64(rec.Values[4]), Score: toFloat64(rec.Values[5]),
			})
		}
		return out, records.Err()
	})
	if err != nil {
		return nil, err
	}
	recs, _ := result.([]TeamMemberRecommendation)
	return recs, nil
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
