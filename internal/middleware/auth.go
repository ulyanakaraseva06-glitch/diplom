package middleware

import (
    "context"
    "net/http"
    "strings"

    "github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
    UserIDKey  contextKey = "user_id"
    UserRoleKey contextKey = "user_role"
)

// AuthMiddleware - проверка JWT токена
func AuthMiddleware(jwtSecret []byte) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                http.Error(w, "Authorization header required", http.StatusUnauthorized)
                return
            }

            parts := strings.Split(authHeader, " ")
            if len(parts) != 2 || parts[0] != "Bearer" {
                http.Error(w, "Invalid authorization format. Use Bearer <token>", http.StatusUnauthorized)
                return
            }

            tokenString := parts[1]

            claims := jwt.MapClaims{}
            token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
                return jwtSecret, nil
            })

            if err != nil || !token.Valid {
                http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
                return
            }

            userIDFloat, ok := claims["user_id"].(float64)
            if !ok {
                http.Error(w, "Invalid token claims", http.StatusUnauthorized)
                return
            }
            userID := int(userIDFloat)

            role, ok := claims["role"].(string)
            if !ok {
                http.Error(w, "Invalid token claims", http.StatusUnauthorized)
                return
            }

            ctx := context.WithValue(r.Context(), UserIDKey, userID)
            ctx = context.WithValue(ctx, UserRoleKey, role)

            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// GetUserID - получение user_id из контекста
func GetUserID(ctx context.Context) (int, bool) {
    userID, ok := ctx.Value(UserIDKey).(int)
    return userID, ok
}

// GetUserRole - получение роли пользователя из контекста
func GetUserRole(ctx context.Context) (string, bool) {
    role, ok := ctx.Value(UserRoleKey).(string)
    return role, ok
}

// ValidateToken - валидация JWT токена
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