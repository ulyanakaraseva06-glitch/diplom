package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"github.com/gorilla/mux"
)

// ListWalletDepositsAdmin — заявки на пополнение для менеджера.
func (h *ClientHandler) ListWalletDepositsAdmin(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.GetUserID(r.Context()); !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	status := r.URL.Query().Get("status")
	var list []models.WalletDeposit
	var err error
	switch status {
	case "":
		list, err = h.walletListDepositsByStatuses(r.Context(), []string{
			models.WalletDepositReview,
			models.WalletDepositPending,
		})
	case "all":
		list, err = h.walletListDepositsByStatuses(r.Context(), nil)
	default:
		list, err = h.walletListDepositsByStatus(r.Context(), status)
	}
	if err != nil {
		http.Error(w, "Failed to list deposits", http.StatusInternalServerError)
		return
	}

	out := make([]models.WalletDepositAdminView, 0, len(list))
	for _, dep := range list {
		item := models.WalletDepositAdminView{WalletDeposit: dep}
		if u, err := h.userRepo.FindByID(r.Context(), dep.UserID); err == nil && u != nil {
			item.Username = u.Username
			item.Email = u.Email
		}
		out = append(out, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// ApproveWalletDepositAdmin — подтвердить пополнение.
func (h *ClientHandler) ApproveWalletDepositAdmin(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.GetUserID(r.Context()); !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	depositID := mux.Vars(r)["id"]
	dep, err := h.walletGetDepositByID(r.Context(), depositID)
	if err != nil {
		http.Error(w, "Deposit not found", http.StatusNotFound)
		return
	}
	if dep.Status != models.WalletDepositReview {
		http.Error(w, "Deposit is not awaiting review", http.StatusBadRequest)
		return
	}

	if err := h.walletUpdateDepositStatus(r.Context(), depositID, models.WalletDepositReview, models.WalletDepositPaid, nil); err != nil {
		http.Error(w, "Failed to approve deposit", http.StatusInternalServerError)
		return
	}

	balance := h.walletBalance(r.Context(), dep.UserID) + dep.Amount
	if err := h.walletSetBalance(r.Context(), dep.UserID, balance); err != nil {
		http.Error(w, "Failed to credit balance", http.StatusInternalServerError)
		return
	}

	h.notifyUser(r.Context(), dep.UserID, "wallet_deposit_approved", "Пополнение кошелька",
		"Заявка на пополнение "+formatRub(dep.Amount)+" подтверждена. Средства зачислены.", depositID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"deposit_id": depositID,
		"status":     models.WalletDepositPaid,
		"message":    "Deposit approved",
	})
}

// RejectWalletDepositAdmin — отклонить пополнение.
func (h *ClientHandler) RejectWalletDepositAdmin(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.GetUserID(r.Context()); !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	depositID := mux.Vars(r)["id"]
	dep, err := h.walletGetDepositByID(r.Context(), depositID)
	if err != nil {
		http.Error(w, "Deposit not found", http.StatusNotFound)
		return
	}
	if dep.Status != models.WalletDepositReview {
		http.Error(w, "Deposit is not awaiting review", http.StatusBadRequest)
		return
	}

	if err := h.walletUpdateDepositStatus(r.Context(), depositID, models.WalletDepositReview, models.WalletDepositRejected, nil); err != nil {
		http.Error(w, "Failed to reject deposit", http.StatusInternalServerError)
		return
	}

	h.notifyUser(r.Context(), dep.UserID, "wallet_deposit_rejected", "Пополнение отклонено",
		"Заявка на пополнение "+formatRub(dep.Amount)+" отклонена. Обратитесь в поддержку, если перевод был выполнен.", depositID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"deposit_id": depositID,
		"status":     models.WalletDepositRejected,
		"message":    "Deposit rejected",
	})
}

func formatRub(amount float64) string {
	return fmt.Sprintf("%.0f ₽", amount)
}
