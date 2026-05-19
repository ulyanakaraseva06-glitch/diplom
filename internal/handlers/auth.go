package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"
	"esports-manager/internal/repository"
	"esports-manager/internal/services"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo    *repository.UserRepository
	syncService *services.SyncService
	mongoDB     *mongo.Database
	jwtSecret   []byte
}

func NewAuthHandler(userRepo *repository.UserRepository, syncService *services.SyncService, mongoDB *mongo.Database, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		userRepo:    userRepo,
		syncService: syncService,
		mongoDB:     mongoDB,
		jwtSecret:   []byte(jwtSecret),
	}
}

func (h *AuthHandler) hasActiveSubscription(userID int) bool {
	if h.mongoDB == nil {
		return false
	}
	count, err := h.mongoDB.Collection("user_subscriptions").CountDocuments(
		context.Background(),
		bson.M{"user_id": userID, "is_active": true},
	)
	return err == nil && count > 0
}

type LoginRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type RegisterRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
    Username string `json:"username"`
}

type AuthResponse struct {
    Token string            `json:"token"`
    User  *models.UserResponse `json:"user"`
}

// Register - регистрация нового пользователя
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
    var req RegisterRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Проверка обязательных полей
    if req.Email == "" || req.Password == "" || req.Username == "" {
        http.Error(w, "Email, password and username are required", http.StatusBadRequest)
        return
    }

    // Проверка, существует ли пользователь
    existingUser, err := h.userRepo.FindByEmail(r.Context(), req.Email)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if existingUser != nil {
        http.Error(w, "User already exists", http.StatusConflict)
        return
    }

    // Хеширование пароля
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        http.Error(w, "Failed to hash password", http.StatusInternalServerError)
        return
    }

    // Создание пользователя в PostgreSQL
    user, err := h.userRepo.Create(r.Context(), req.Email, string(hashedPassword), req.Username, models.RoleUser)
    if err != nil {
        log.Printf("Register: failed to create user in PostgreSQL: %v", err)
        http.Error(w, "Failed to create user: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Копия профиля в MongoDB для клиентского модуля
    if h.syncService != nil {
        if err := h.syncService.SyncUser(r.Context(), user); err != nil {
            log.Printf("Register: failed to sync user %d to MongoDB: %v", user.ID, err)
        }
    }

    // Генерация JWT токена
    token, err := h.generateToken(user.ID, user.Role)
    if err != nil {
        http.Error(w, "Failed to generate token", http.StatusInternalServerError)
        return
    }

    response := AuthResponse{
        Token: token,
        User:  user.ToResponse(),
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(response)
}

// Login - вход пользователя
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
    var req LoginRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Проверка обязательных полей
    if req.Email == "" || req.Password == "" {
        http.Error(w, "Email and password are required", http.StatusBadRequest)
        return
    }

    // Поиск пользователя
    user, err := h.userRepo.FindByEmail(r.Context(), req.Email)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if user == nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    // Проверка пароля
    err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
    if err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    if h.syncService != nil {
        if err := h.syncService.SyncUser(r.Context(), user); err != nil {
            log.Printf("Login: failed to sync user %d to MongoDB: %v", user.ID, err)
        }
    }

    // Генерация JWT токена
    token, err := h.generateToken(user.ID, user.Role)
    if err != nil {
        http.Error(w, "Failed to generate token", http.StatusInternalServerError)
        return
    }

    response := AuthResponse{
        Token: token,
        User:  user.ToResponse(),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// generateToken - генерация JWT токена
func (h *AuthHandler) generateToken(userID int, role models.UserRole) (string, error) {
    claims := jwt.MapClaims{
        "user_id": userID,
        "role":    string(role),
        "exp":     time.Now().Add(time.Hour * 24).Unix(), // Токен живет 24 часа
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(h.jwtSecret)
}
// ValidateToken - валидация JWT токена и возврат claims
func ValidateToken(tokenString string, jwtSecret []byte) (jwt.MapClaims, error) {
    claims := jwt.MapClaims{}
    token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
        return jwtSecret, nil
    })
    if err != nil || !token.Valid {
        return nil, err
    }
    return claims, nil
}
// GetMe - получение текущего пользователя
func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    user, err := h.userRepo.FindByID(r.Context(), userID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if user == nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    if h.syncService != nil {
        if err := h.syncService.SyncUser(r.Context(), user); err != nil {
            log.Printf("GetMe: failed to sync user %d to MongoDB: %v", user.ID, err)
        }
    }

    resp := user.ToResponse()
    if h.mongoDB != nil {
        ch := ClientHandler{mongoDB: h.mongoDB, userRepo: h.userRepo}
        if p, err := ch.ensureMongoUser(r.Context(), userID); err == nil {
            resp.AvatarURL = p.AvatarURL
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

// UpdateUser - обновление данных пользователя (только username)
func (h *AuthHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req struct {
        Username string `json:"username"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    if req.Username == "" {
        http.Error(w, "Username is required", http.StatusBadRequest)
        return
    }

    if !h.hasActiveSubscription(userID) {
        http.Error(w, "Active subscription required to change username", http.StatusForbidden)
        return
    }

    // Обновляем пользователя в PostgreSQL
    err := h.userRepo.UpdateUsername(r.Context(), userID, req.Username)
    if err != nil {
        http.Error(w, "Failed to update user: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Получаем обновлённого пользователя
    user, err := h.userRepo.FindByID(r.Context(), userID)
    if err != nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user.ToResponse())
}