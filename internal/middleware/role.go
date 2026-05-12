package middleware

import (
    "net/http"
)

// RequireRole - проверка, что у пользователя есть одна из разрешенных ролей
func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            role, ok := GetUserRole(r.Context())
            if !ok {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
            }

            // Проверяем, есть ли роль пользователя в списке разрешенных
            for _, allowed := range allowedRoles {
                if role == allowed {
                    next.ServeHTTP(w, r)
                    return
                }
            }

            http.Error(w, "Forbidden: insufficient permissions", http.StatusForbidden)
        })
    }
}

// RequireManager - проверка, что пользователь является менеджером
func RequireManager(next http.Handler) http.Handler {
    return RequireRole("manager")(next)
}

// RequireManagerOrOrganizer - проверка, что пользователь менеджер или организатор
func RequireManagerOrOrganizer(next http.Handler) http.Handler {
    return RequireRole("manager", "organizer")(next)
}