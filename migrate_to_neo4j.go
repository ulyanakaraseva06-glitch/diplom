// scripts/migrate_simple.go - упрощённая версия
package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	"esports-manager/internal/config"
	"esports-manager/internal/db"
	"esports-manager/internal/mongo"
	"esports-manager/internal/repository"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.mongodb.org/mongo-driver/bson"
)

type UserMongo struct {
	ID        int        `bson:"id"`
	Email     string     `bson:"email"`
	Username  string     `bson:"username"`
	GameCards []GameCard `bson:"game_cards"`
	Balance   float64    `bson:"balance"`
}

type GameCard struct {
	ID      string `bson:"id"`
	Game    string `bson:"game"`
	Rank    string `bson:"rank"`
	Comment string `bson:"comment"`
}

func main() {
	log.Println("=== SIMPLE MIGRATION TO Neo4j ===")

	cfg := config.Load()

	// PostgreSQL
	postgresDB, err := db.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("PG error: %v", err)
	}
	defer postgresDB.Close()
	userRepo := repository.NewUserRepository(postgresDB)

	// MongoDB
	mongoClient, err := mongo.NewMongoClient(cfg.MongoURI, cfg.MongoDBName)
	if err != nil {
		log.Fatalf("MongoDB error: %v", err)
	}
	defer mongoClient.Close()

	// Neo4j driver
	driver, err := neo4j.NewDriverWithContext(cfg.Neo4jURI, neo4j.BasicAuth(cfg.Neo4jUsername, cfg.Neo4jPassword, ""))
	if err != nil {
		log.Fatalf("Neo4j driver error: %v", err)
	}
	defer driver.Close(context.Background())

	ctx := context.Background()
	err = driver.VerifyConnectivity(ctx)
	if err != nil {
		log.Fatalf("Neo4j connection error: %v", err)
	}
	log.Println("Connected to Neo4j")

	// Получаем пользователей из MongoDB
	cursor, err := mongoClient.Database.Collection("users").Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Failed to get users: %v", err)
	}
	defer cursor.Close(ctx)

	var users []UserMongo
	cursor.All(ctx, &users)
	log.Printf("Found %d users", len(users))

	session := driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	for _, user := range users {
		// Получаем username из PG
		pgUser, _ := userRepo.FindByID(ctx, user.ID)
		username := fmt.Sprintf("user_%d", user.ID)
		if pgUser != nil {
			username = pgUser.Username
		}

		// MMR
		mmr := 1500 + len(user.GameCards)*50

		// Определяем роль
		role := "carry"
		for _, card := range user.GameCards {
			if strings.Contains(strings.ToLower(card.Comment), "support") {
				role = "support"
			}
			if strings.Contains(strings.ToLower(card.Comment), "mid") {
				role = "mid"
			}
		}

		// Создаём пользователя в Neo4j
		_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
			query := `
				MERGE (u:User {id: $id})
				SET u.nickname = $nickname,
				    u.email = $email,
				    u.mmr = $mmr,
				    u.role = $role,
				    u.registered_at = datetime()
			`
			return tx.Run(ctx, query, map[string]any{
				"id":       fmt.Sprintf("user_%03d", user.ID),
				"nickname": username,
				"email":    user.Email,
				"mmr":      mmr,
				"role":     role,
			})
		})
		if err != nil {
			log.Printf("Failed to create user %d: %v", user.ID, err)
		} else {
			log.Printf("✓ User %d (%s) created", user.ID, username)
		}

		// Добавляем интересы к играм
		for _, card := range user.GameCards {
			if card.Game == "" {
				continue
			}
			level := "amateur"
			if strings.Contains(strings.ToLower(card.Rank), "pro") {
				level = "professional"
			}

			_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
				query := `
					MERGE (g:Game {name: $gameName})
					WITH g
					MATCH (u:User {id: $userId})
					MERGE (u)-[r:INTERESTED_IN]->(g)
					SET r.level = $level
				`
				return tx.Run(ctx, query, map[string]any{
					"userId":   fmt.Sprintf("user_%03d", user.ID),
					"gameName": card.Game,
					"level":    level,
				})
			})
			if err != nil {
				log.Printf("Failed to add interest %s for user %d: %v", card.Game, user.ID, err)
			} else {
				log.Printf("  ✓ Interest: %s -> %s", username, card.Game)
			}
		}
	}

	log.Println("\n=== MIGRATION COMPLETED ===")
}