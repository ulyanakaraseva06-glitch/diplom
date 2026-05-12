package handlers

import (
    "encoding/json"
    "log"
    "net/http"
    "time"
    "fmt"

    "esports-manager/internal/middleware"
    "esports-manager/internal/models"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
)

type ClientHandler struct {
    mongoDB *mongo.Database
}

func NewClientHandler(mongoDB *mongo.Database) *ClientHandler {
    return &ClientHandler{mongoDB: mongoDB}
}

// GetTournaments - список турниров из MongoDB
func (h *ClientHandler) GetTournaments(w http.ResponseWriter, r *http.Request) {
    cursor, err := h.mongoDB.Collection("tournaments").Find(r.Context(), bson.M{})
    if err != nil {
        http.Error(w, "Failed to fetch tournaments", http.StatusInternalServerError)
        return
    }
    defer cursor.Close(r.Context())

    var tournaments []bson.M
    if err = cursor.All(r.Context(), &tournaments); err != nil {
        http.Error(w, "Failed to decode tournaments", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(tournaments)
}

// RegisterForTournament - регистрация на турнир
func (h *ClientHandler) RegisterForTournament(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req struct {
        TournamentID int `json:"tournament_id"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    // Проверяем существование турнира в MongoDB
    var tournament bson.M
    err := h.mongoDB.Collection("tournaments").FindOne(r.Context(), bson.M{"id": req.TournamentID}).Decode(&tournament)
    if err != nil {
        http.Error(w, "Tournament not found", http.StatusNotFound)
        return
    }

    // Проверяем, не зарегистрирован ли уже пользователь
    count, err := h.mongoDB.Collection("round_tournaments").CountDocuments(r.Context(), bson.M{
        "tournament_id": req.TournamentID,
        "user_id":       userID,
    })
    if err == nil && count > 0 {
        http.Error(w, "Already registered", http.StatusConflict)
        return
    }

    // Создаём запись в round_tournaments (первый раунд)
    roundDoc := bson.M{
        "tournament_id": req.TournamentID,
        "user_id":       userID,
        "round":         1,
        "score":         "",
        "users_score":   "",
        "MVP":           false,
    }

    _, err = h.mongoDB.Collection("round_tournaments").InsertOne(r.Context(), roundDoc)
    if err != nil {
        http.Error(w, "Failed to register", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "Registered successfully"})
}

// GetProfile - получение профиля из MongoDB
func (h *ClientHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
    log.Println("GetProfile called")
    
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        log.Println("GetProfile: Unauthorized - no userID in context")
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    log.Printf("GetProfile: userID = %d", userID)

    var profile models.UserMongo
    err := h.mongoDB.Collection("users").FindOne(r.Context(), bson.M{"id": userID}).Decode(&profile)
    if err == mongo.ErrNoDocuments {
        log.Printf("GetProfile: user %d not found in MongoDB, returning empty", userID)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "game":         []string{},
            "rank":         []string{},
            "achievements": []string{},
        })
        return
    }
    if err != nil {
        log.Printf("GetProfile: database error for user %d: %v", userID, err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    log.Printf("GetProfile: returning profile for user %d: %+v", userID, profile)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(profile)
}

// UpdateProfile - обновление профиля в MongoDB
func (h *ClientHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req struct {
        Game         []string `json:"game"`
        Rank         []string `json:"rank"`
        Achievements []string `json:"achievements"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        log.Printf("UpdateProfile: invalid request body: %v", err)
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    log.Printf("UpdateProfile: userID=%d, game=%v, rank=%v, achievements=%v", userID, req.Game, req.Rank, req.Achievements)

    update := bson.M{
        "$set": bson.M{
            "game":         req.Game,
            "rank":         req.Rank,
            "achievements": req.Achievements,
        },
    }

    _, err := h.mongoDB.Collection("users").UpdateOne(
        r.Context(),
        bson.M{"id": userID},
        update,
    )
    if err != nil {
        log.Printf("UpdateProfile: database error: %v", err)
        http.Error(w, "Failed to update profile", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated"})
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

// AddFriend - добавление друга
func (h *ClientHandler) AddFriend(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req struct {
        FriendID int `json:"friend_id"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    // Проверяем, что не добавляем самого себя
    if userID == req.FriendID {
        http.Error(w, "Cannot add yourself as friend", http.StatusBadRequest)
        return
    }

    // Проверяем, не добавлен ли уже друг
    count, err := h.mongoDB.Collection("friends").CountDocuments(r.Context(), bson.M{
        "user_id":   userID,
        "friend_id": req.FriendID,
    })
    if err != nil {
        log.Printf("AddFriend: check error: %v", err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if count > 0 {
        http.Error(w, "Already friends", http.StatusConflict)
        return
    }

    // Добавляем в MongoDB
    friendDoc := bson.M{
        "user_id":    userID,
        "friend_id":  req.FriendID,
        "created_at": time.Now(),
    }

    _, err = h.mongoDB.Collection("friends").InsertOne(r.Context(), friendDoc)
    if err != nil {
        log.Printf("AddFriend: insert error: %v", err)
        http.Error(w, "Failed to add friend", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "Friend added successfully"})
}
// GetSubscriptions - список доступных подписок
func (h *ClientHandler) GetSubscriptions(w http.ResponseWriter, r *http.Request) {
    cursor, err := h.mongoDB.Collection("subscriptions").Find(r.Context(), bson.M{})
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

// GetUserSubscription - получить подписку пользователя
func (h *ClientHandler) GetUserSubscription(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var userSub models.UserSubscription
    err := h.mongoDB.Collection("user_subscriptions").FindOne(r.Context(), bson.M{
        "user_id": userID,
        "is_active": true,
    }).Decode(&userSub)
    if err == mongo.ErrNoDocuments {
        json.NewEncoder(w).Encode(nil)
        return
    }
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(userSub)
}

// Subscribe - оформление подписки
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
        bson.M{"user_id": userID, "is_active": true},
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
        StartDate:      time.Now(),
        EndDate:        time.Now().AddDate(0, 1, 0), // на 1 месяц
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

// CancelSubscription - отмена подписки
func (h *ClientHandler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    _, err := h.mongoDB.Collection("user_subscriptions").UpdateOne(
        r.Context(),
        bson.M{"user_id": userID, "is_active": true},
        bson.M{"$set": bson.M{"is_active": false, "auto_renew": false}},
    )
    if err != nil {
        http.Error(w, "Failed to cancel subscription", http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(map[string]string{"message": "Subscription cancelled"})
}

func generateID() string {
    return fmt.Sprintf("%d", time.Now().UnixNano())
}