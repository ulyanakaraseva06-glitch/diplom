package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetWallet — баланс кошелька
func (h *ClientHandler) GetWallet(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	balance := 0.0
	if h.mongoDB != nil {
		balance = h.getUserBalance(r.Context(), userID)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]float64{"balance": balance})
}

func (h *ClientHandler) getUserBalance(ctx context.Context, userID int) float64 {
	var u models.UserMongo
	err := h.mongoDB.Collection("users").FindOne(ctx, bson.M{"id": userID}).Decode(&u)
	if err != nil {
		return 0
	}
	return u.Balance
}

func (h *ClientHandler) setUserBalance(ctx context.Context, userID int, balance float64) error {
	if h.mongoDB == nil {
		return fmt.Errorf("mongodb unavailable")
	}
	_, err := h.mongoDB.Collection("users").UpdateOne(
		ctx,
		bson.M{"id": userID},
		bson.M{"$set": bson.M{"balance": balance}},
		options.Update().SetUpsert(true),
	)
	return err
}

// DepositWallet — пополнение кошелька
func (h *ClientHandler) DepositWallet(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 || req.Amount > 1000000 {
		http.Error(w, "Invalid amount", http.StatusBadRequest)
		return
	}

	balance := h.getUserBalance(r.Context(), userID) + req.Amount
	if err := h.setUserBalance(r.Context(), userID, balance); err != nil {
		http.Error(w, "Failed to deposit", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]float64{"balance": balance})
}

// SubscribeWithBalance — оплата подписки с кошелька
func (h *ClientHandler) SubscribeWithBalance(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		SubscriptionID string `json:"subscription_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var subscription models.Subscription
	err := h.mongoDB.Collection("subscriptions").FindOne(r.Context(), bson.M{"id": req.SubscriptionID}).Decode(&subscription)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "Subscription not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	balance := h.getUserBalance(r.Context(), userID)
	price := float64(subscription.Price)
	if balance < price {
		http.Error(w, "Insufficient balance", http.StatusPaymentRequired)
		return
	}

	if err := h.setUserBalance(r.Context(), userID, balance-price); err != nil {
		http.Error(w, "Failed to deduct balance", http.StatusInternalServerError)
		return
	}

	_, _ = h.mongoDB.Collection("user_subscriptions").UpdateMany(
		r.Context(),
		bson.M{"user_id": userID, "is_active": true},
		bson.M{"$set": bson.M{"is_active": false}},
	)

	userSub := models.UserSubscription{
		ID: newMongoID(), UserID: userID, SubscriptionID: req.SubscriptionID,
		StartDate: time.Now(), EndDate: time.Now().AddDate(0, 1, 0),
		IsActive: true, AutoRenew: false,
	}
	if _, err := h.mongoDB.Collection("user_subscriptions").InsertOne(r.Context(), userSub); err != nil {
		http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":      "Subscribed successfully",
		"balance":      balance - price,
		"subscription": userSub,
	})
}

// HasActiveSubscription — проверка активной подписки
func (h *ClientHandler) HasActiveSubscription(ctx context.Context, userID int) bool {
	count, err := h.mongoDB.Collection("user_subscriptions").CountDocuments(ctx, bson.M{
		"user_id": userID, "is_active": true,
	})
	return err == nil && count > 0
}
