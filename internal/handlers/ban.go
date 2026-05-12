package handlers

import (
    "context"
    "encoding/json"
    "net/http"
    "strconv"

    "esports-manager/internal/middleware"
    "esports-manager/internal/models"
    "esports-manager/internal/repository"

    "github.com/gorilla/mux"
)

type BanHandler struct {
    banRepo  *repository.BanRepository
    userRepo *repository.UserRepository
}

func NewBanHandler(banRepo *repository.BanRepository, userRepo *repository.UserRepository) *BanHandler {
    return &BanHandler{
        banRepo:  banRepo,
        userRepo: userRepo,
    }
}

// CreateBan - блокировка пользователя (только менеджер)
func (h *BanHandler) CreateBan(w http.ResponseWriter, r *http.Request) {
    moderatorID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req models.BanRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    if req.UserID == 0 || req.Reason == "" {
        http.Error(w, "User ID and reason are required", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь существует
    user, err := h.userRepo.FindByID(r.Context(), req.UserID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if user == nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    // Нельзя заблокировать менеджера
    if user.Role == models.RoleManager {
        http.Error(w, "Cannot ban a manager", http.StatusForbidden)
        return
    }

    ban, err := h.banRepo.Create(r.Context(), &req, moderatorID)
    if err != nil {
        http.Error(w, "Failed to create ban: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(ban)
}

// RemoveBan - разблокировка пользователя (только менеджер)
func (h *BanHandler) RemoveBan(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    userID, err := strconv.Atoi(vars["user_id"])
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    err = h.banRepo.Deactivate(r.Context(), userID)
    if err != nil {
        http.Error(w, "Failed to remove ban: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"message": "User unbanned successfully"}`))
}

// GetActiveBan - получить активную блокировку пользователя
func (h *BanHandler) GetActiveBan(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    userID, err := strconv.Atoi(vars["user_id"])
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    ban, err := h.banRepo.FindActiveByUserID(r.Context(), userID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    if ban == nil {
        w.WriteHeader(http.StatusNotFound)
        w.Write([]byte(`{"message": "No active ban found"}`))
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(ban)
}

// ListActiveBans - список всех активных блокировок
func (h *BanHandler) ListActiveBans(w http.ResponseWriter, r *http.Request) {
    limit := 50
    offset := 0

    if l := r.URL.Query().Get("limit"); l != "" {
        if val, err := strconv.Atoi(l); err == nil && val > 0 {
            limit = val
        }
    }
    if o := r.URL.Query().Get("offset"); o != "" {
        if val, err := strconv.Atoi(o); err == nil && val >= 0 {
            offset = val
        }
    }

    bans, err := h.banRepo.ListActive(r.Context(), limit, offset)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(bans)
}

// CheckBan - проверка, заблокирован ли пользователь (для middleware)
func (h *BanHandler) CheckBan(userID int) (bool, error) {
    ban, err := h.banRepo.FindActiveByUserID(context.Background(), userID)
    if err != nil {
        return false, err
    }
    return ban != nil, nil
}