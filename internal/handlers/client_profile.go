package handlers

import (
	"context"
	"fmt"
	"log"

	"esports-manager/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func bsonString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func bsonStringSlice(v interface{}) []string {
	if v == nil {
		return nil
	}
	switch arr := v.(type) {
	case []string:
		return arr
	case bson.A:
		out := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	case []interface{}:
		out := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	default:
		if s, ok := v.(string); ok && s != "" {
			return []string{s}
		}
	}
	return nil
}

func bsonGameCards(v interface{}) []models.GameCard {
	if v == nil {
		return []models.GameCard{}
	}
	raw, ok := v.(bson.A)
	if !ok {
		if slice, ok := v.([]interface{}); ok {
			raw = bson.A(slice)
		} else {
			return []models.GameCard{}
		}
	}
	cards := make([]models.GameCard, 0, len(raw))
	for _, item := range raw {
		m, ok := item.(bson.M)
		if !ok {
			if m2, ok := item.(map[string]interface{}); ok {
				m = bson.M(m2)
			} else {
				continue
			}
		}
		cards = append(cards, models.GameCard{
			ID:      bsonString(m["id"]),
			Game:    bsonString(m["game"]),
			Rank:    bsonString(m["rank"]),
			Comment: bsonString(m["comment"]),
		})
	}
	return cards
}

func mapBSONToUserMongo(raw bson.M) models.UserMongo {
	p := models.UserMongo{
		ID:           bsonInt(raw["id"]),
		Email:        bsonString(raw["email"]),
		PasswordHash: bsonString(raw["password_hash"]),
		Game:         bsonStringSlice(raw["game"]),
		Rank:         bsonStringSlice(raw["rank"]),
		Achievements: bsonStringSlice(raw["achievements"]),
		GameCards:    bsonGameCards(raw["game_cards"]),
		AvatarURL:    bsonString(raw["avatar_url"]),
		Theme:        bsonString(raw["theme"]),
	}
	if bal, ok := raw["balance"].(float64); ok {
		p.Balance = bal
	}
	if p.GameCards == nil {
		p.GameCards = []models.GameCard{}
	}
	return p
}

func (h *ClientHandler) createMongoUserFromPG(ctx context.Context, userID int) (models.UserMongo, error) {
	user, err := h.userRepo.FindByID(ctx, userID)
	if err != nil {
		return models.UserMongo{}, err
	}
	if user == nil {
		return models.UserMongo{}, fmt.Errorf("user %d not found in PostgreSQL", userID)
	}

	profile := models.UserMongo{
		ID:        user.ID,
		Email:     user.Email,
		GameCards: []models.GameCard{},
		Balance:   0,
		Theme:     "cyber",
	}

	_, err = h.mongoDB.Collection("users").UpdateOne(
		ctx,
		bson.M{"id": userID},
		bson.M{"$set": profile},
		options.Update().SetUpsert(true),
	)
	return profile, err
}

func (h *ClientHandler) loadMongoProfile(ctx context.Context, userID int) (models.UserMongo, error) {
	var raw bson.M
	err := h.mongoDB.Collection("users").FindOne(ctx, bson.M{"id": userID}).Decode(&raw)
	if err != nil {
		return models.UserMongo{}, err
	}
	return mapBSONToUserMongo(raw), nil
}

// ensureMongoUser — гарантирует документ пользователя в MongoDB (создаёт из PostgreSQL при отсутствии).
func (h *ClientHandler) ensureMongoUser(ctx context.Context, userID int) (models.UserMongo, error) {
	if h.mongoDB == nil {
		return models.UserMongo{ID: userID, GameCards: []models.GameCard{}}, nil
	}

	profile, err := h.loadMongoProfile(ctx, userID)
	if err == nil {
		return profile, nil
	}
	if err != mongo.ErrNoDocuments {
		log.Printf("ensureMongoUser: decode/load error for user %d: %v — recreating", userID, err)
		_, _ = h.mongoDB.Collection("users").DeleteOne(ctx, bson.M{"id": userID})
	}

	return h.createMongoUserFromPG(ctx, userID)
}
