// Однократная миграция данных из MongoDB/PostgreSQL в Neo4j.
// Запуск: go run ./scripts/migrate_to_neo4j.go
package main

import (
	"context"
	"fmt"
	"log"

	"esports-manager/internal/config"
	"esports-manager/internal/db"
	"esports-manager/internal/handlers"
	"esports-manager/internal/models"
	"esports-manager/internal/mongo"
	"esports-manager/internal/neo4j"
	"esports-manager/internal/repository"

	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	log.Println("=== Migration to Neo4j ===")
	cfg := config.Load()

	postgresDB, err := db.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("PostgreSQL: %v", err)
	}
	defer postgresDB.Close()
	userRepo := repository.NewUserRepository(postgresDB)

	mongoClient, err := mongo.NewMongoClient(cfg.MongoURI, cfg.MongoDBName)
	if err != nil {
		log.Fatalf("MongoDB: %v", err)
	}
	defer mongoClient.Close()

	neoClient, err := neo4j.NewNeo4jClient(cfg.Neo4jURI, cfg.Neo4jUsername, cfg.Neo4jPassword, cfg.Neo4jDatabase)
	if err != nil {
		log.Fatalf("Neo4j: %v", err)
	}
	defer neoClient.Close()

	ctx := context.Background()
	mongoDB := mongoClient.Database

	type userMongo struct {
		ID        int               `bson:"id"`
		GameCards []models.GameCard `bson:"game_cards"`
	}

	var users []userMongo
	cur, err := mongoDB.Collection("users").Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("users: %v", err)
	}
	if err := cur.All(ctx, &users); err != nil {
		log.Fatalf("users decode: %v", err)
	}
	log.Printf("Syncing %d users...", len(users))
	for _, u := range users {
		handlers.SyncUserProfileToNeo4j(ctx, neoClient, userRepo, mongoDB, u.ID, u.GameCards)
	}

	friendCur, err := mongoDB.Collection("friends").Find(ctx, bson.M{})
	if err == nil {
		var friends []bson.M
		_ = friendCur.All(ctx, &friends)
		seen := map[string]bool{}
		for _, f := range friends {
			uid := bsonInt(f["user_id"])
			fid := bsonInt(f["friend_id"])
			if uid <= 0 || fid <= 0 {
				continue
			}
			a, b := uid, fid
			if a > b {
				a, b = b, a
			}
			key := fmt.Sprintf("%d:%d", a, b)
			if seen[key] {
				continue
			}
			seen[key] = true
			_ = neoClient.CreateFriendship(ctx, a, b)
		}
		log.Printf("Friendships: %d pairs", len(seen))
	}

	teamCur, err := mongoDB.Collection("teams").Find(ctx, bson.M{})
	if err == nil {
		var teams []models.TeamMongo
		_ = teamCur.All(ctx, &teams)
		for _, t := range teams {
			if t.ID == "" {
				continue
			}
			_ = neoClient.SyncTeam(ctx, t.ID, t.Name, t.MemberIDs)
		}
		log.Printf("Teams: %d", len(teams))
	}

	log.Println("=== Migration completed ===")
}

func bsonInt(v interface{}) int {
	switch x := v.(type) {
	case int32:
		return int(x)
	case int64:
		return int(x)
	case int:
		return x
	case float64:
		return int(x)
	default:
		return 0
	}
}
