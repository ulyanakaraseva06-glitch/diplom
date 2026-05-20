package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"
	"esports-manager/internal/repository"
	"esports-manager/internal/utils"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Client struct {
	Conn *websocket.Conn
	Role string
}

type SupportHandler struct {
	supportRepo    *repository.SupportRepository
	userRepo       *repository.UserRepository
	jwtSecret      string
	upgrader       websocket.Upgrader
	userClients    map[int]*Client // игрок: ключ = user_id
	managerClients map[int]*Client // менеджер в чате: ключ = id пользователя в диалоге
	clientsMux     sync.RWMutex
}

func NewSupportHandler(supportRepo *repository.SupportRepository, userRepo *repository.UserRepository, jwtSecret string) *SupportHandler {
	return &SupportHandler{
		supportRepo:    supportRepo,
		userRepo:       userRepo,
		jwtSecret:      jwtSecret,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
		userClients:    make(map[int]*Client),
		managerClients: make(map[int]*Client),
	}
}

func (h *SupportHandler) buildSupportMessage(userID int, managerID *int, text, imageURL string, isFromUser bool) *models.SupportMessage {
	return &models.SupportMessage{
		UserID:     userID,
		ManagerID:  managerID,
		Message:    messageWithImage(text, imageURL),
		ImageURL:   imageURL,
		IsFromUser: isFromUser,
		IsRead:     false,
		CreatedAt:  time.Now(),
	}
}

func (h *SupportHandler) supportMessageResponse(ctx context.Context, msg *models.SupportMessage) map[string]interface{} {
	text, img := supportMessageParts(msg.Message, msg.ImageURL)
	item := map[string]interface{}{
		"id":           msg.ID,
		"user_id":      msg.UserID,
		"message":      text,
		"image_url":    img,
		"is_from_user": msg.IsFromUser,
		"is_read":      msg.IsRead,
		"created_at":   msg.CreatedAt,
	}
	if msg.ManagerID != nil {
		item["manager_id"] = *msg.ManagerID
		if manager, err := h.userRepo.FindByID(ctx, *msg.ManagerID); err == nil && manager != nil {
			item["manager_name"] = manager.Username
			item["username"] = manager.Username
			item["email"] = manager.Email
		}
	} else if msg.IsFromUser {
		if user, err := h.userRepo.FindByID(ctx, msg.UserID); err == nil && user != nil {
			item["username"] = user.Username
			item["email"] = user.Email
		}
	} else {
		item["username"] = "Поддержка"
	}
	return item
}

func (h *SupportHandler) pushWS(chatUserID int, payload map[string]interface{}, toUser, toManager bool) {
	h.clientsMux.RLock()
	defer h.clientsMux.RUnlock()
	if toUser {
		if c, ok := h.userClients[chatUserID]; ok {
			_ = c.Conn.WriteJSON(payload)
		}
	}
	if toManager {
		if c, ok := h.managerClients[chatUserID]; ok {
			_ = c.Conn.WriteJSON(payload)
		}
	}
}

// NotifySupportMessage — вызывается из мессенджера игрока (HTTP), чтобы менеджер увидел сообщение в реальном времени.
func (h *SupportHandler) NotifySupportMessage(ctx context.Context, msg *models.SupportMessage) {
	if msg == nil || !msg.IsFromUser {
		return
	}
	h.pushWS(msg.UserID, h.supportMessageResponse(ctx, msg), false, true)
}

// GetActiveChats - список пользователей с активными чатами (для менеджера)
func (h *SupportHandler) GetActiveChats(w http.ResponseWriter, r *http.Request) {
	role, _ := middleware.GetUserRole(r.Context())
	if role != "manager" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	chats, err := h.supportRepo.GetUsersWithActiveChats(r.Context())
	if err != nil {
		http.Error(w, "Failed to load active chats: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chats)
}

// UploadImage - загрузка изображения для чата
func (h *SupportHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.GetUserID(r.Context()); !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Failed to get image file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	allowedTypes := map[string]bool{
		"image/jpeg": true, "image/png": true, "image/gif": true, "image/webp": true,
	}
	if !allowedTypes[handler.Header.Get("Content-Type")] {
		http.Error(w, "Invalid file type. Only JPEG, PNG, GIF, WEBP allowed", http.StatusBadRequest)
		return
	}

	uploadDir := filepath.Join(utils.GetProjectRoot(), "uploads", "support")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	ext := filepath.Ext(handler.Filename)
	filename := fmt.Sprintf("%d_%d%s", time.Now().UnixNano(), time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	imageURL := "/uploads/support/" + filename
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": imageURL})
}

// SendMessage - отправка сообщения от менеджера (HTTP)
func (h *SupportHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	role, _ := middleware.GetUserRole(r.Context())
	if role != "manager" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

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

	var req models.SupportMessageCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Message == "" && req.ImageURL == "" {
		http.Error(w, "Message or image is required", http.StatusBadRequest)
		return
	}

	message := h.buildSupportMessage(userID, &managerID, req.Message, req.ImageURL, false)

	if err := h.supportRepo.Create(r.Context(), message); err != nil {
		http.Error(w, "Failed to save message: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := h.supportMessageResponse(r.Context(), message)
	h.pushWS(userID, resp, true, true)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
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
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var response []map[string]interface{}
	for _, msg := range messages {
		response = append(response, h.supportMessageResponse(r.Context(), msg))
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

	fromUser := role == "manager"
	count, err := h.supportRepo.GetUnreadCount(r.Context(), userID, fromUser)
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

	fromUser := role == "manager"
	if err := h.supportRepo.MarkAsRead(r.Context(), userID, fromUser); err != nil {
		http.Error(w, "Failed to mark messages as read: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Messages marked as read"})
}

// WebSocket - чат в реальном времени
func (h *SupportHandler) WebSocket(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}

	chatUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user_id", http.StatusBadRequest)
		return
	}

	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "token required", http.StatusUnauthorized)
		return
	}

	claims, err := middleware.ValidateToken(token, []byte(h.jwtSecret))
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	tokenUserID, ok := claims["user_id"].(float64)
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusUnauthorized)
		return
	}

	role, _ := claims["role"].(string)

	if role != "manager" && int(tokenUserID) != chatUserID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket: upgrade failed: %v", err)
		return
	}

	client := &Client{Conn: conn, Role: role}
	h.clientsMux.Lock()
	if role == "manager" {
		h.managerClients[chatUserID] = client
	} else {
		h.userClients[chatUserID] = client
	}
	h.clientsMux.Unlock()

	defer func() {
		h.clientsMux.Lock()
		if role == "manager" {
			delete(h.managerClients, chatUserID)
		} else {
			delete(h.userClients, chatUserID)
		}
		h.clientsMux.Unlock()
		conn.Close()
	}()

	for {
		var req models.SupportMessageCreate
		if err := conn.ReadJSON(&req); err != nil {
			break
		}

		if req.Message == "" && req.ImageURL == "" {
			continue
		}

		isFromUser := role != "manager"
		var message *models.SupportMessage

		if role == "manager" {
			mid := int(tokenUserID)
			message = h.buildSupportMessage(chatUserID, &mid, req.Message, req.ImageURL, false)
		} else {
			message = h.buildSupportMessage(chatUserID, nil, req.Message, req.ImageURL, true)
		}

		if err := h.supportRepo.Create(r.Context(), message); err != nil {
			log.Printf("WebSocket: failed to save: %v", err)
			continue
		}

		resp := h.supportMessageResponse(r.Context(), message)
		if isFromUser {
			h.pushWS(chatUserID, resp, false, true)
		} else {
			h.pushWS(chatUserID, resp, true, true)
		}
	}
}
