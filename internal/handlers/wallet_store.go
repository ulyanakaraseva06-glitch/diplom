package handlers

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"esports-manager/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	memWalletMu       sync.RWMutex
	memWalletBalances = map[int]float64{}
	memWalletDeposits = map[string]models.WalletDeposit{}
)

func (h *ClientHandler) walletBalance(ctx context.Context, userID int) float64 {
	if h.mongoDB != nil {
		return h.getUserBalance(ctx, userID)
	}
	memWalletMu.RLock()
	defer memWalletMu.RUnlock()
	return memWalletBalances[userID]
}

func (h *ClientHandler) walletSetBalance(ctx context.Context, userID int, balance float64) error {
	if h.mongoDB != nil {
		return h.setUserBalance(ctx, userID, balance)
	}
	memWalletMu.Lock()
	memWalletBalances[userID] = balance
	memWalletMu.Unlock()
	return nil
}

func (h *ClientHandler) walletSaveDeposit(ctx context.Context, dep models.WalletDeposit) error {
	if h.mongoDB != nil {
		_, err := h.mongoDB.Collection("wallet_deposits").InsertOne(ctx, dep)
		return err
	}
	memWalletMu.Lock()
	memWalletDeposits[dep.ID] = dep
	memWalletMu.Unlock()
	return nil
}

func (h *ClientHandler) walletGetDepositByID(ctx context.Context, depositID string) (models.WalletDeposit, error) {
	if h.mongoDB != nil {
		var dep models.WalletDeposit
		err := h.mongoDB.Collection("wallet_deposits").FindOne(ctx, bson.M{"id": depositID}).Decode(&dep)
		if err == mongo.ErrNoDocuments {
			return models.WalletDeposit{}, fmt.Errorf("deposit not found")
		}
		return dep, err
	}
	memWalletMu.RLock()
	defer memWalletMu.RUnlock()
	dep, ok := memWalletDeposits[depositID]
	if !ok {
		return models.WalletDeposit{}, fmt.Errorf("deposit not found")
	}
	return dep, nil
}

func (h *ClientHandler) walletGetDeposit(ctx context.Context, depositID string, userID int) (models.WalletDeposit, error) {
	dep, err := h.walletGetDepositByID(ctx, depositID)
	if err != nil {
		return dep, err
	}
	if dep.UserID != userID {
		return models.WalletDeposit{}, fmt.Errorf("deposit not found")
	}
	return dep, nil
}

func (h *ClientHandler) walletUpdateDepositStatus(ctx context.Context, depositID string, fromStatus, toStatus string, extra bson.M) error {
	now := time.Now()
	set := bson.M{"status": toStatus}
	for k, v := range extra {
		set[k] = v
	}
	if toStatus == models.WalletDepositReview {
		set["reviewed_at"] = now
	}
	if toStatus == models.WalletDepositPaid || toStatus == models.WalletDepositRejected {
		set["paid_at"] = now
	}

	if h.mongoDB != nil {
		filter := bson.M{"id": depositID, "status": fromStatus}
		res, err := h.mongoDB.Collection("wallet_deposits").UpdateOne(ctx, filter, bson.M{"$set": set})
		if err != nil {
			return err
		}
		if res.MatchedCount == 0 {
			return fmt.Errorf("deposit not found or status changed")
		}
		return nil
	}

	memWalletMu.Lock()
	defer memWalletMu.Unlock()
	dep, ok := memWalletDeposits[depositID]
	if !ok || dep.Status != fromStatus {
		return fmt.Errorf("deposit not found or status changed")
	}
	dep.Status = toStatus
	if toStatus == models.WalletDepositReview {
		dep.ReviewedAt = now
	}
	if toStatus == models.WalletDepositPaid || toStatus == models.WalletDepositRejected {
		dep.PaidAt = now
	}
	memWalletDeposits[depositID] = dep
	return nil
}

func (h *ClientHandler) walletListDepositsByStatuses(ctx context.Context, statuses []string) ([]models.WalletDeposit, error) {
	filter := bson.M{}
	if len(statuses) > 0 {
		filter["status"] = bson.M{"$in": statuses}
	}
	if h.mongoDB != nil {
		opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
		cursor, err := h.mongoDB.Collection("wallet_deposits").Find(ctx, filter, opts)
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)
		var list []models.WalletDeposit
		if err := cursor.All(ctx, &list); err != nil {
			return nil, err
		}
		if list == nil {
			list = []models.WalletDeposit{}
		}
		return list, nil
	}

	memWalletMu.RLock()
	defer memWalletMu.RUnlock()
	allow := map[string]bool{}
	for _, s := range statuses {
		allow[s] = true
	}
	var list []models.WalletDeposit
	for _, d := range memWalletDeposits {
		if len(allow) == 0 || allow[d.Status] {
			list = append(list, d)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})
	return list, nil
}

func (h *ClientHandler) walletListDepositsByStatus(ctx context.Context, status string) ([]models.WalletDeposit, error) {
	return h.walletListDepositsByStatuses(ctx, []string{status})
}

func (h *ClientHandler) notifyUser(ctx context.Context, userID int, nType, title, body, refID string) {
	if h.mongoDB == nil {
		return
	}
	h.createNotification(ctx, userID, nType, title, body, refID)
}
