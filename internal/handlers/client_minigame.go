package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const dragonRunnerColl = "dragon_runner_best"

type dragonRunnerBestMongo struct {
	UserID    int       `bson:"user_id"`
	BestScore int       `bson:"best_score"`
	UpdatedAt time.Time `bson:"updated_at"`
}

type dragonRunnerLeaderboardEntry struct {
	Rank      int    `json:"rank"`
	UserID    int    `json:"user_id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
	Score     int    `json:"score"`
}

// GetDragonRunnerLeaderboard — топ-3 игроков по лучшему счёту в мини-игре.
func (h *ClientHandler) GetDragonRunnerLeaderboard(w http.ResponseWriter, r *http.Request) {
	if h.mongoDB == nil {
		json.NewEncoder(w).Encode([]dragonRunnerLeaderboardEntry{})
		return
	}

	opts := options.Find().SetSort(bson.D{{Key: "best_score", Value: -1}}).SetLimit(3)
	cursor, err := h.mongoDB.Collection(dragonRunnerColl).Find(r.Context(), bson.M{}, opts)
	if err != nil {
		http.Error(w, "Failed to load leaderboard", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(r.Context())

	var rows []dragonRunnerBestMongo
	if err := cursor.All(r.Context(), &rows); err != nil {
		http.Error(w, "Failed to load leaderboard", http.StatusInternalServerError)
		return
	}

	entries := h.buildDragonRunnerLeaderboard(r.Context(), rows)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

// SubmitDragonRunnerScore — сохраняет лучший результат игрока (только если выше предыдущего).
func (h *ClientHandler) SubmitDragonRunnerScore(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		http.Error(w, "Storage unavailable", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		Score int `json:"score"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Score < 1 || req.Score > 50000 {
		http.Error(w, "Invalid score", http.StatusBadRequest)
		return
	}

	coll := h.mongoDB.Collection(dragonRunnerColl)
	var existing dragonRunnerBestMongo
	err := coll.FindOne(r.Context(), bson.M{"user_id": userID}).Decode(&existing)
	if err != nil && err != mongo.ErrNoDocuments {
		http.Error(w, "Failed to save score", http.StatusInternalServerError)
		return
	}

	improved := err == mongo.ErrNoDocuments || req.Score > existing.BestScore
	if improved {
		_, err = coll.UpdateOne(
			r.Context(),
			bson.M{"user_id": userID},
			bson.M{"$set": bson.M{
				"user_id":    userID,
				"best_score": req.Score,
				"updated_at": time.Now(),
			}},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			http.Error(w, "Failed to save score", http.StatusInternalServerError)
			return
		}
	}

	best := req.Score
	if !improved {
		best = existing.BestScore
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"best_score": best,
		"improved":   improved,
	})
}

func (h *ClientHandler) buildDragonRunnerLeaderboard(ctx context.Context, rows []dragonRunnerBestMongo) []dragonRunnerLeaderboardEntry {
	entries := make([]dragonRunnerLeaderboardEntry, 0, len(rows))
	for i, row := range rows {
		entry := dragonRunnerLeaderboardEntry{
			Rank: i + 1, UserID: row.UserID, Score: row.BestScore,
		}
		if u, err := h.userRepo.FindByID(ctx, row.UserID); err == nil && u != nil {
			entry.Username = u.Username
		} else {
			entry.Username = "Игрок"
		}
		if h.mongoDB != nil {
			var mu models.UserMongo
			if err := h.mongoDB.Collection("users").FindOne(ctx, bson.M{"id": row.UserID}).Decode(&mu); err == nil {
				entry.AvatarURL = mu.AvatarURL
			}
		}
		entries = append(entries, entry)
	}
	return entries
}
