package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetWallet — баланс кошелька
func (h *ClientHandler) GetWallet(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	balance := h.walletBalance(r.Context(), userID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]float64{"balance": balance})
}

func (h *ClientHandler) getUserBalance(ctx context.Context, userID int) float64 {
	if h.mongoDB == nil {
		return 0
	}
	// Только balance: полный UserMongo может не декодироваться (game как string вместо []string).
	var doc bson.M
	err := h.mongoDB.Collection("users").FindOne(
		ctx,
		bson.M{"id": userID},
		options.FindOne().SetProjection(bson.M{"balance": 1, "_id": 0}),
	).Decode(&doc)
	if err != nil {
		return 0
	}
	switch v := doc["balance"].(type) {
	case float64:
		return v
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	case int:
		return float64(v)
	default:
		return 0
	}
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

// DepositWallet — устаревшее мгновенное пополнение (оставлено для совместимости).
func (h *ClientHandler) DepositWallet(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Use POST /api/client/wallet/deposit/create for QR payment", http.StatusGone)
}

// CreateWalletDeposit — создать заявку на пополнение и вернуть payload для QR.
func (h *ClientHandler) CreateWalletDeposit(w http.ResponseWriter, r *http.Request) {
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

	depositID := newDepositID()
	purpose := fmt.Sprintf("Пополнение GAMER.OK user#%d id:%s", userID, depositID)
	cfg := loadSBPReceiverConfig()
	qrPayload := buildSBPPayload(cfg, req.Amount, purpose)

	dep := models.WalletDeposit{
		ID:        depositID,
		UserID:    userID,
		Amount:    req.Amount,
		Status:    models.WalletDepositPending,
		Purpose:   purpose,
		QRPayload: qrPayload,
		CreatedAt: time.Now(),
	}
	if err := h.walletSaveDeposit(r.Context(), dep); err != nil {
		http.Error(w, "Failed to create deposit", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"deposit_id": depositID,
		"amount":     req.Amount,
		"status":     dep.Status,
		"purpose":    purpose,
	})
}

// GetWalletDepositStatus — статус заявки на пополнение.
func (h *ClientHandler) GetWalletDepositStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	depositID := mux.Vars(r)["id"]
	dep, err := h.walletGetDeposit(r.Context(), depositID, userID)
	if err != nil {
		http.Error(w, "Deposit not found", http.StatusNotFound)
		return
	}

	resp := map[string]interface{}{
		"deposit_id": dep.ID,
		"amount":     dep.Amount,
		"status":     dep.Status,
		"qr_payload": dep.QRPayload,
		"purpose":    dep.Purpose,
	}
	if dep.Status == models.WalletDepositPaid {
		resp["balance"] = h.walletBalance(r.Context(), userID)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// ConfirmWalletDeposit — пользователь нажал «Я оплатил», заявка уходит на проверку админу.
func (h *ClientHandler) ConfirmWalletDeposit(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	depositID := mux.Vars(r)["id"]

	dep, err := h.walletGetDeposit(r.Context(), depositID, userID)
	if err != nil {
		http.Error(w, "Deposit not found", http.StatusNotFound)
		return
	}

	if dep.Status == models.WalletDepositPaid {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"deposit_id": dep.ID,
			"status":     dep.Status,
			"balance":    h.walletBalance(r.Context(), userID),
			"message":    "Уже зачислено",
		})
		return
	}
	if dep.Status == models.WalletDepositReview {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"deposit_id": depositID,
			"status":     models.WalletDepositReview,
			"message":    "Заявка уже на проверке",
		})
		return
	}
	if dep.Status == models.WalletDepositRejected {
		http.Error(w, "Заявка отклонена", http.StatusBadRequest)
		return
	}
	if dep.Status != models.WalletDepositPending {
		http.Error(w, "Некорректный статус заявки", http.StatusBadRequest)
		return
	}

	if err := h.walletUpdateDepositStatus(r.Context(), depositID, models.WalletDepositPending, models.WalletDepositReview, nil); err != nil {
		http.Error(w, "Failed to submit deposit", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"deposit_id": depositID,
		"status":     models.WalletDepositReview,
		"message":    "Заявка отправлена на проверку администратору",
	})
}
