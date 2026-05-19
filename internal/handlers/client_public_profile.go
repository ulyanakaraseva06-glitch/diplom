package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"github.com/gorilla/mux"
)

type publicProfileView struct {
	ID        int               `json:"id"`
	Username  string            `json:"username"`
	AvatarURL string            `json:"avatar_url"`
	GameCards []models.GameCard `json:"game_cards"`
}

// GetPublicProfile — профиль игрока для друзей (никнейм, аватар, карточки игр)
func (h *ClientHandler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	targetID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil || targetID <= 0 {
		http.Error(w, "Invalid user id", http.StatusBadRequest)
		return
	}

	if targetID != userID && !h.getFriendIDSet(r.Context(), userID)[targetID] {
		http.Error(w, "Not friends", http.StatusForbidden)
		return
	}

	u, err := h.userRepo.FindByID(r.Context(), targetID)
	if err != nil || u == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	view := publicProfileView{
		ID: targetID, Username: u.Username, GameCards: []models.GameCard{},
	}

	if h.mongoDB != nil {
		profile, err := h.ensureMongoUser(r.Context(), targetID)
		if err == nil {
			view.AvatarURL = profile.AvatarURL
			view.GameCards = legacyToGameCards(profile)
			if view.GameCards == nil {
				view.GameCards = []models.GameCard{}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(view)
}
