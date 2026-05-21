package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"
	"esports-manager/internal/neo4j"
	"esports-manager/internal/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// SupportNotifier — уведомление менеджеров о новых сообщениях в поддержку (WebSocket).
type SupportNotifier interface {
	NotifySupportMessage(ctx context.Context, msg *models.SupportMessage)
}

type ClientHandler struct {
	mongoDB          *mongo.Database
	userRepo         *repository.UserRepository
	supportRepo      *repository.SupportRepository
	supportNotifier  SupportNotifier
	tournamentRepo   *repository.TournamentRepository
	registrationRepo *repository.RegistrationRepository
	banRepo          *repository.BanRepository
	neo4jClient      *neo4j.Neo4jClient
}

func NewClientHandler(
	mongoDB *mongo.Database,
	userRepo *repository.UserRepository,
	supportRepo *repository.SupportRepository,
	supportNotifier SupportNotifier,
	tournamentRepo *repository.TournamentRepository,
	registrationRepo *repository.RegistrationRepository,
	banRepo *repository.BanRepository,
	neo4jClient *neo4j.Neo4jClient,
) *ClientHandler {
	return &ClientHandler{
		mongoDB: mongoDB, userRepo: userRepo,
		supportRepo: supportRepo, supportNotifier: supportNotifier,
		tournamentRepo: tournamentRepo, registrationRepo: registrationRepo,
		banRepo: banRepo, neo4jClient: neo4jClient,
	}
}
// GetUserTheme - получение темы пользователя
func (h *ClientHandler) GetUserTheme(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var user models.UserMongo
    err := h.mongoDB.Collection("users").FindOne(r.Context(), bson.M{"id": userID}).Decode(&user)
    if err != nil {
        // Если пользователь не найден, возвращаем тему по умолчанию
        json.NewEncoder(w).Encode(map[string]string{"theme": "cyber"})
        return
    }

    theme := user.Theme
    if theme == "" {
        theme = "cyber"
    }

    json.NewEncoder(w).Encode(map[string]string{"theme": theme})
}

// UpdateUserTheme - обновление темы пользователя
func (h *ClientHandler) UpdateUserTheme(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req struct {
        Theme string `json:"theme"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    // Валидация темы
    validThemes := map[string]bool{"light": true, "dark": true, "cyber": true}
    if !validThemes[req.Theme] {
        http.Error(w, "Invalid theme", http.StatusBadRequest)
        return
    }

    update := bson.M{
        "$set": bson.M{
            "theme": req.Theme,
        },
    }

    _, err := h.mongoDB.Collection("users").UpdateOne(
        r.Context(),
        bson.M{"id": userID},
        update,
    )
    if err != nil {
        http.Error(w, "Failed to update theme", http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(map[string]string{"message": "Theme updated", "theme": req.Theme})
}
func (h *ClientHandler) emptyProfileResponse(userID int) map[string]interface{} {
	return map[string]interface{}{
		"id":         userID,
		"game_cards": []models.GameCard{},
		"avatar_url": "",
		"balance":    0,
	}
}

func legacyToGameCards(profile models.UserMongo) []models.GameCard {
	if len(profile.GameCards) > 0 {
		return profile.GameCards
	}
	maxLen := len(profile.Game)
	if len(profile.Rank) > maxLen {
		maxLen = len(profile.Rank)
	}
	if len(profile.Achievements) > maxLen {
		maxLen = len(profile.Achievements)
	}
	cards := make([]models.GameCard, 0)
	for i := 0; i < maxLen; i++ {
		game := ""
		if i < len(profile.Game) {
			game = profile.Game[i]
		}
		if game == "" {
			continue
		}
		rank, comment := "", ""
		if i < len(profile.Rank) {
			rank = profile.Rank[i]
		}
		if i < len(profile.Achievements) {
			comment = profile.Achievements[i]
		}
		cards = append(cards, models.GameCard{
			ID: newMongoID(), Game: game, Rank: rank, Comment: comment,
		})
	}
	return cards
}

// GetProfile - получение профиля из MongoDB
func (h *ClientHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	profile, err := h.ensureMongoUser(r.Context(), userID)
	if err != nil {
		log.Printf("GetProfile: ensureMongoUser failed for %d: %v", userID, err)
		resp := h.emptyProfileResponse(userID)
		if user, uerr := h.userRepo.FindByID(r.Context(), userID); uerr == nil && user != nil {
			resp["email"] = user.Email
		}
		json.NewEncoder(w).Encode(resp)
		return
	}

	profile.GameCards = legacyToGameCards(profile)
	if profile.GameCards == nil {
		profile.GameCards = []models.GameCard{}
	}

	email := profile.Email
	if email == "" {
		if user, uerr := h.userRepo.FindByID(r.Context(), userID); uerr == nil && user != nil {
			email = user.Email
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         profile.ID,
		"email":      email,
		"game_cards": profile.GameCards,
		"avatar_url": profile.AvatarURL,
		"balance":    profile.Balance,
		"theme":      profile.Theme,
		"mongo_ready": h.mongoDB != nil,
	})
}

// UpdateProfileGameCards — сохранение карточек игр в MongoDB
func (h *ClientHandler) UpdateProfileGameCards(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		http.Error(w, "MongoDB unavailable", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		GameCards []models.GameCard `json:"game_cards"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	for i := range req.GameCards {
		if req.GameCards[i].Game == "" {
			http.Error(w, "Game name is required in each card", http.StatusBadRequest)
			return
		}
		if len(req.GameCards[i].Comment) > 500 {
			http.Error(w, "Comment must be at most 500 characters", http.StatusBadRequest)
			return
		}
		if req.GameCards[i].ID == "" {
			req.GameCards[i].ID = newMongoID()
		}
	}

	if _, err := h.ensureMongoUser(r.Context(), userID); err != nil {
		log.Printf("UpdateProfileGameCards: ensureMongoUser %d: %v", userID, err)
		http.Error(w, "Failed to prepare profile", http.StatusInternalServerError)
		return
	}

	setFields := bson.M{
		"id":         userID,
		"game_cards": req.GameCards,
	}
	if pgUser, err := h.userRepo.FindByID(r.Context(), userID); err == nil && pgUser != nil {
		setFields["email"] = pgUser.Email
	}

	_, err := h.mongoDB.Collection("users").UpdateOne(
		r.Context(),
		bson.M{"id": userID},
		bson.M{"$set": setFields},
	)
	if err != nil {
		log.Printf("UpdateProfileGameCards: update %d: %v", userID, err)
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	SyncUserProfileToNeo4j(r.Context(), h.neo4jClient, h.userRepo, h.mongoDB, userID, req.GameCards)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"game_cards": req.GameCards})
}

// GetRecommendations — рекомендации друзей из Neo4j.
func (h *ClientHandler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.neo4jClient == nil {
		http.Error(w, "Neo4j unavailable", http.StatusServiceUnavailable)
		return
	}

	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}
	recommendations, err := h.neo4jClient.GetFriendRecommendations(r.Context(), userID, limit)
	if err != nil {
		log.Printf("GetRecommendations: %v", err)
		http.Error(w, "Failed to get recommendations", http.StatusInternalServerError)
		return
	}
	if recommendations == nil {
		recommendations = []neo4j.Recommendation{}
	}
	recommendations = filterFriendRecommendations(
		recommendations,
		h.getFriendIDSet(r.Context(), userID),
		h.getPendingRequestPairs(r.Context(), userID),
	)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(recommendations)
}

// GetTeamRecommendations — рекомендации участников для команды.
func (h *ClientHandler) GetTeamRecommendations(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.neo4jClient == nil {
		http.Error(w, "Neo4j unavailable", http.StatusServiceUnavailable)
		return
	}

	teamID := r.URL.Query().Get("team_id")
	limit := 10
	recs, err := h.neo4jClient.GetTeamMemberRecommendations(r.Context(), userID, teamID, limit)
	if err != nil {
		log.Printf("GetTeamRecommendations: %v", err)
		http.Error(w, "Failed to get team recommendations", http.StatusInternalServerError)
		return
	}
	if recs == nil {
		recs = []neo4j.TeamMemberRecommendation{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(recs)
}

// UpdateProfileAvatar — URL аватара в MongoDB
func (h *ClientHandler) UpdateProfileAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		http.Error(w, "MongoDB unavailable", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if _, err := h.ensureMongoUser(r.Context(), userID); err != nil {
		log.Printf("UpdateProfileAvatar: ensureMongoUser %d: %v", userID, err)
		http.Error(w, "Failed to prepare profile", http.StatusInternalServerError)
		return
	}

	setFields := bson.M{"avatar_url": req.AvatarURL, "id": userID}
	if pgUser, err := h.userRepo.FindByID(r.Context(), userID); err == nil && pgUser != nil {
		setFields["email"] = pgUser.Email
	}

	_, err := h.mongoDB.Collection("users").UpdateOne(
		r.Context(),
		bson.M{"id": userID},
		bson.M{"$set": setFields},
	)
	if err != nil {
		log.Printf("UpdateProfileAvatar: update %d: %v", userID, err)
		http.Error(w, "Failed to update avatar", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"avatar_url": req.AvatarURL})
}

// GetFriends - список друзей пользователя
func (h *ClientHandler) GetFriends(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    cursor, err := h.mongoDB.Collection("friends").Find(r.Context(), bson.M{"user_id": userID})
    if err != nil {
        log.Printf("GetFriends: database error: %v", err)
        http.Error(w, "Failed to fetch friends", http.StatusInternalServerError)
        return
    }
    defer cursor.Close(r.Context())

    var friends []bson.M
    if err = cursor.All(r.Context(), &friends); err != nil {
        log.Printf("GetFriends: decode error: %v", err)
        http.Error(w, "Failed to decode friends", http.StatusInternalServerError)
        return
    }

    // Возвращаем список ID друзей
    var friendIDs []int
    for _, f := range friends {
        if id, ok := f["friend_id"].(int); ok {
            friendIDs = append(friendIDs, id)
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(friendIDs)
}

// AddFriend — отправка заявки в друзья (совместимость со старым API)
func (h *ClientHandler) AddFriend(w http.ResponseWriter, r *http.Request) {
	h.SendFriendRequest(w, r)
}

// GetSubscriptions - список доступных подписок с фильтрацией по роли
func (h *ClientHandler) GetSubscriptions(w http.ResponseWriter, r *http.Request) {
    // Получаем роль пользователя (userID не нужен, но получаем его для проверки авторизации)
    _, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    
    role, _ := middleware.GetUserRole(r.Context())
    
    // Строим фильтр в зависимости от роли
    filter := bson.M{}
    
    switch role {
    case "organizer":
        // Организатор видит только подписку для организатора
        filter = bson.M{"target_type": "organizer"}
    case "manager":
        // Менеджер видит все подписки
        filter = bson.M{}
    default:
        // Обычный пользователь видит подписки для пользователя и команды
        filter = bson.M{"target_type": bson.M{"$in": []string{"user", "team"}}}
    }
    
    cursor, err := h.mongoDB.Collection("subscriptions").Find(r.Context(), filter)
    if err != nil {
        http.Error(w, "Failed to fetch subscriptions", http.StatusInternalServerError)
        return
    }
    defer cursor.Close(r.Context())

    var subscriptions []bson.M
    if err = cursor.All(r.Context(), &subscriptions); err != nil {
        http.Error(w, "Failed to decode subscriptions", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(subscriptions)
}

// Subscribe - оформление подписки (без оплаты, устаревший демо-маршрут)
func (h *ClientHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
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

    // Проверяем существование подписки
    var subscription models.Subscription
    err := h.mongoDB.Collection("subscriptions").FindOne(r.Context(), bson.M{"id": req.SubscriptionID}).Decode(&subscription)
    if err != nil {
        http.Error(w, "Subscription not found", http.StatusNotFound)
        return
    }

    // Деактивируем старые подписки пользователя
    _, err = h.mongoDB.Collection("user_subscriptions").UpdateMany(
        r.Context(),
        bson.M{"user_id": userID, "is_active": true, "source": "self"},
        bson.M{"$set": bson.M{"is_active": false}},
    )
    if err != nil {
        log.Printf("Failed to deactivate old subscriptions: %v", err)
    }

    // Создаём новую подписку
    userSub := models.UserSubscription{
        ID:             generateID(),
        UserID:         userID,
        SubscriptionID: req.SubscriptionID,
        Source:         "self",
        TeamID:         "",
        StartDate:      time.Now(),
        EndDate:        time.Now().AddDate(0, 1, 0),
        IsActive:       true,
        AutoRenew:      false,
    }

    _, err = h.mongoDB.Collection("user_subscriptions").InsertOne(r.Context(), userSub)
    if err != nil {
        http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "Subscribed successfully"})
}

func generateID() string {
    return fmt.Sprintf("%d", time.Now().UnixNano())
}