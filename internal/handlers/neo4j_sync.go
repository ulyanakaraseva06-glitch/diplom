package handlers

import (
	"context"
	"log"
	"strings"

	"esports-manager/internal/models"
	"esports-manager/internal/neo4j"
	"esports-manager/internal/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func determineRoleFromGameCards(cards []models.GameCard) string {
	roles := map[string]int{
		"carry": 0, "mid": 0, "offlane": 0, "support": 0,
		"jungle": 0, "sniper": 0, "medic": 0, "tank": 0,
	}
	for _, card := range cards {
		comment := strings.ToLower(card.Comment)
		rank := strings.ToLower(card.Rank)
		if strings.Contains(comment, "carry") || strings.Contains(rank, "carry") {
			roles["carry"]++
		}
		if strings.Contains(comment, "mid") || strings.Contains(comment, "мид") {
			roles["mid"]++
		}
		if strings.Contains(comment, "support") || strings.Contains(comment, "саппорт") {
			roles["support"]++
		}
	}
	maxRole, maxCount := "carry", 0
	for role, count := range roles {
		if count > maxCount {
			maxCount = count
			maxRole = role
		}
	}
	return maxRole
}

func gameInterestLevel(card models.GameCard) string {
	rankLower := strings.ToLower(card.Rank)
	commentLower := strings.ToLower(card.Comment)
	if strings.Contains(commentLower, "pro") || strings.Contains(commentLower, "профи") ||
		rankLower == "pro" || rankLower == "professional" {
		return "professional"
	}
	return "amateur"
}

func calcMMR(gameCards []models.GameCard, balance float64) int {
	mmr := 1500 + len(gameCards)*50
	if balance > 0 {
		mmr += int(balance) / 100
	}
	if mmr > 5000 {
		mmr = 5000
	}
	return mmr
}

func SyncUserProfileToNeo4j(
	ctx context.Context,
	client *neo4j.Neo4jClient,
	userRepo *repository.UserRepository,
	mongoDB *mongo.Database,
	userID int,
	gameCards []models.GameCard,
) {
	if client == nil {
		return
	}
	user, err := userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return
	}
	var userMongo models.UserMongo
	if mongoDB != nil {
		_ = mongoDB.Collection("users").FindOne(ctx, bson.M{"id": userID}).Decode(&userMongo)
	}
	if len(gameCards) == 0 {
		gameCards = userMongo.GameCards
	}
	mmr := calcMMR(gameCards, userMongo.Balance)
	role := determineRoleFromGameCards(gameCards)
	if err := client.CreateUserNode(ctx, userID, user.Username, user.Email, "", role, mmr); err != nil {
		log.Printf("neo4j: CreateUserNode %d: %v", userID, err)
		return
	}
	_ = client.ClearUserGameInterests(ctx, userID)
	for _, card := range gameCards {
		if card.Game == "" {
			continue
		}
		_ = client.UpdateUserGameInterest(ctx, userID, card.Game, gameInterestLevel(card))
	}
	log.Printf("neo4j: profile synced user %d", userID)
}

func syncFriendshipToNeo4j(ctx context.Context, client *neo4j.Neo4jClient, a, b int, create bool) {
	if client == nil {
		return
	}
	var err error
	if create {
		err = client.CreateFriendship(ctx, a, b)
	} else {
		err = client.DeleteFriendship(ctx, a, b)
	}
	if err != nil {
		log.Printf("neo4j: friendship %d-%d: %v", a, b, err)
	}
}

func filterFriendRecommendations(
	recs []neo4j.Recommendation,
	friends map[int]bool,
	pending map[int]string,
) []neo4j.Recommendation {
	if len(recs) == 0 {
		return recs
	}
	out := make([]neo4j.Recommendation, 0, len(recs))
	for _, rec := range recs {
		id, ok := neo4j.ParseUserNodeID(rec.UserID)
		if !ok || friends[id] || pending[id] != "" {
			continue
		}
		out = append(out, rec)
	}
	return out
}

func syncTeamToNeo4j(ctx context.Context, client *neo4j.Neo4jClient, teamID, teamName string, memberIDs []int) {
	if client == nil {
		return
	}
	if err := client.SyncTeam(ctx, teamID, teamName, memberIDs); err != nil {
		log.Printf("neo4j: team %s: %v", teamID, err)
	}
}
