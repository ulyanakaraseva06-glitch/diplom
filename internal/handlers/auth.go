package handlers

import (
    "encoding/json"
    "net/http"
    "time"
    "esports-manager/internal/models"
    "esports-manager/internal/repository"

    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
    userRepo *repository.UserRepository
    jwtSecret []byte
}

func NewAuthHandler(userRepo *repository.UserRepository, jwtSecret string) *AuthHandler {
    return &AuthHandler{
        userRepo:  userRepo,
        jwtSecret: []byte(jwtSecret),
    }
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

    // Создание пользователя
    user, err := h.userRepo.Create(r.Context(), req.Email, string(hashedPassword), req.Username, models.RoleUser)
    if err != nil {
        http.Error(w, "Failed to create user", http.StatusInternalServerError)
        return
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
        "role":    role,
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