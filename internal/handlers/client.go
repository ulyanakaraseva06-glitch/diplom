package handlers

import (
    "encoding/json"
    "net/http"
    "esports-manager/internal/middleware"
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

// RegisterForTournament - регистрация на турнир (создание записи в round_tournaments)
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
        "user_id": userID,
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