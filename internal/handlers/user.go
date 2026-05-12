package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"

    "esports-manager/internal/repository"
    "github.com/gorilla/mux"
)

type UserHandler struct {
    userRepo *repository.UserRepository
}

func NewUserHandler(userRepo *repository.UserRepository) *UserHandler {
    return &UserHandler{userRepo: userRepo}
}

// ListUsers - список всех пользователей
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
    users, err := h.userRepo.List(r.Context(), 100, 0)
    if err != nil {
        http.Error(w, "Failed to get users", http.StatusInternalServerError)
        return
    }

    var response []map[string]interface{}
    for _, u := range users {
        response = append(response, map[string]interface{}{
            "id":         u.ID,
            "email":      u.Email,
            "username":   u.Username,
            "role":       u.Role,
            "created_at": u.CreatedAt,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// GetUserByID - получить пользователя по ID
func (h *UserHandler) GetUserByID(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    user, err := h.userRepo.FindByID(r.Context(), id)
    if err != nil {
        http.Error(w, "Failed to get user", http.StatusInternalServerError)
        return
    }
    if user == nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    response := map[string]interface{}{
        "id":         user.ID,
        "email":      user.Email,
        "username":   user.Username,
        "role":       user.Role,
        "created_at": user.CreatedAt,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}