package handlers

import (
    "encoding/json"
    "log"
    "net/http"
    "strconv"
    "sync"
    "time"

    "esports-manager/internal/middleware"
    "esports-manager/internal/models"
    "esports-manager/internal/repository"

    "github.com/gorilla/mux"
    "github.com/gorilla/websocket"
)

type SupportHandler struct {
    supportRepo *repository.SupportRepository
    userRepo    *repository.UserRepository
    jwtSecret   string
    upgrader    websocket.Upgrader
    clients     map[int]*websocket.Conn
    clientsMux  sync.RWMutex
}

func NewSupportHandler(supportRepo *repository.SupportRepository, userRepo *repository.UserRepository, jwtSecret string) *SupportHandler {
    return &SupportHandler{
        supportRepo: supportRepo,
        userRepo:    userRepo,
        jwtSecret:   jwtSecret,
        upgrader: websocket.Upgrader{
            CheckOrigin: func(r *http.Request) bool {
                return true
            },
        },
        clients: make(map[int]*websocket.Conn),
    }
}

// SendMessage - отправка сообщения (HTTP, для отправки от менеджера)
func (h *SupportHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    userID, err := strconv.Atoi(vars["user_id"])
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    managerID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    _, _ = middleware.GetUserRole(r.Context()) // временно игнорируем

    var req models.SupportMessageCreate
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    if req.Message == "" {
        http.Error(w, "Message is required", http.StatusBadRequest)
        return
    }

    message := &models.SupportMessage{
        UserID:     userID,
        ManagerID:  &managerID,
        Message:    req.Message,
        IsFromUser: false,
        IsRead:     false,
        CreatedAt:  time.Now(),
    }

    err = h.supportRepo.Create(r.Context(), message)
    if err != nil {
        http.Error(w, "Failed to save message: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Отправляем через WebSocket если пользователь онлайн
    h.clientsMux.RLock()
    conn, ok := h.clients[userID]
    h.clientsMux.RUnlock()

    if ok {
        manager, _ := h.userRepo.FindByID(r.Context(), managerID)
        managerName := ""
        if manager != nil {
            managerName = manager.Username
        }

        response := map[string]interface{}{
            "id":            message.ID,
            "user_id":       userID,
            "message":       message.Message,
            "is_from_user":  false,
            "is_read":       false,
            "created_at":    message.CreatedAt,
            "manager_name":  managerName,
            "username":      managerName,
        }
        conn.WriteJSON(response)
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(message)
}

// GetMessages - получение истории сообщений
func (h *SupportHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    userID, err := strconv.Atoi(vars["user_id"])
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    managerID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    role, _ := middleware.GetUserRole(r.Context())

    if role != "manager" && managerID != userID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

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

    messages, err := h.supportRepo.GetMessages(r.Context(), userID, limit, offset)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    var response []map[string]interface{}
    for _, msg := range messages {
        item := map[string]interface{}{
            "id":            msg.ID,
            "user_id":       msg.UserID,
            "message":       msg.Message,
            "is_from_user":  msg.IsFromUser,
            "is_read":       msg.IsRead,
            "created_at":   msg.CreatedAt,
        }

        if msg.ManagerID != nil {
            item["manager_id"] = *msg.ManagerID
            manager, err := h.userRepo.FindByID(r.Context(), *msg.ManagerID)
            if err == nil && manager != nil {
                item["manager_name"] = manager.Username
                item["username"] = manager.Username
            }
        } else {
            // Пользовательское сообщение
            user, err := h.userRepo.FindByID(r.Context(), msg.UserID)
            if err == nil && user != nil {
                item["username"] = user.Username
            }
        }

        response = append(response, item)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// GetUnreadCount - количество непрочитанных сообщений
func (h *SupportHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    userID, err := strconv.Atoi(vars["user_id"])
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    managerID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    role, _ := middleware.GetUserRole(r.Context())

    if role != "manager" && managerID != userID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    count, err := h.supportRepo.GetUnreadCount(r.Context(), userID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]int{"unread_count": count})
}

// MarkAsRead - отметить сообщения как прочитанные
func (h *SupportHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    userID, err := strconv.Atoi(vars["user_id"])
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    managerID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    role, _ := middleware.GetUserRole(r.Context())

    if role != "manager" && managerID != userID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    err = h.supportRepo.MarkAsRead(r.Context(), userID)
    if err != nil {
        http.Error(w, "Failed to mark messages as read: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"message": "Messages marked as read"}`))
}

// WebSocket - WebSocket соединение для чата в реальном времени
// WebSocket - WebSocket соединение для чата в реальном времени
// WebSocket - WebSocket соединение для чата в реальном времени
func (h *SupportHandler) WebSocket(w http.ResponseWriter, r *http.Request) {
    userIDStr := r.URL.Query().Get("user_id")
    if userIDStr == "" {
        log.Println("WebSocket: user_id required")
        http.Error(w, "user_id required", http.StatusBadRequest)
        return
    }

    userID, err := strconv.Atoi(userIDStr)
    if err != nil {
        log.Println("WebSocket: invalid user_id")
        http.Error(w, "Invalid user_id", http.StatusBadRequest)
        return
    }

    token := r.URL.Query().Get("token")
    if token == "" {
        log.Println("WebSocket: token required")
        http.Error(w, "token required", http.StatusUnauthorized)
        return
    }

    claims, err := middleware.ValidateToken(token, []byte(h.jwtSecret))
    if err != nil {
        log.Printf("WebSocket: invalid token: %v", err)
        http.Error(w, "Invalid token", http.StatusUnauthorized)
        return
    }

    tokenUserID, ok := claims["user_id"].(float64)
    if !ok {
        log.Println("WebSocket: user_id not found in token")
        http.Error(w, "Invalid token claims", http.StatusUnauthorized)
        return
    }

    role, _ := claims["role"].(string)

    if role != "manager" && int(tokenUserID) != userID {
        log.Printf("WebSocket: user_id mismatch. Token: %d, Request: %d", int(tokenUserID), userID)
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    log.Printf("WebSocket: user_id=%d, role=%s - connecting", userID, role)

    conn, err := h.upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("WebSocket: upgrade failed: %v", err)
        return
    }

    h.clientsMux.Lock()
    h.clients[userID] = conn
    h.clientsMux.Unlock()

    log.Printf("WebSocket: user_id=%d connected", userID)

    defer func() {
        h.clientsMux.Lock()
        delete(h.clients, userID)
        h.clientsMux.Unlock()
        log.Printf("WebSocket: user_id=%d disconnected", userID)
    }()

    for {
        var msg models.SupportMessageCreate
        err := conn.ReadJSON(&msg)
        if err != nil {
            log.Printf("WebSocket: read error: %v", err)
            break
        }

        log.Printf("WebSocket: received from user_id=%d: %s", userID, msg.Message)

        isFromUser := true
        if role == "manager" {
            isFromUser = false
        }

        message := &models.SupportMessage{
            UserID:     userID,
            Message:    msg.Message,
            IsFromUser: isFromUser,
            IsRead:     false,
            CreatedAt:  time.Now(),
        }

        if role == "manager" {
            managerID := int(tokenUserID)
            message.ManagerID = &managerID
        }

        if err := h.supportRepo.Create(r.Context(), message); err != nil {
            log.Printf("WebSocket: failed to save: %v", err)
            continue
        }

        // Отправляем всем подключённым (кроме отправителя)
        h.clientsMux.RLock()
        for id, clientConn := range h.clients {
            if id != userID {
                clientConn.WriteJSON(map[string]interface{}{
                    "id":           message.ID,
                    "user_id":      userID,
                    "message":      msg.Message,
                    "is_from_user": isFromUser,
                    "created_at":   message.CreatedAt,
                })
            }
        }
        h.clientsMux.RUnlock()
    }
}