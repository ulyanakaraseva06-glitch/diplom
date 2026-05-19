package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const supportChatID = 0

type chatPreview struct {
	ID           int       `json:"id"`
	Username     string    `json:"username"`
	AvatarURL    string    `json:"avatar_url"`
	IsSupport    bool      `json:"is_support"`
	LastMessage  string    `json:"last_message,omitempty"`
	LastMessageAt time.Time `json:"last_message_at,omitempty"`
}

// ListChats — список чатов (Поддержка + друзья)
func (h *ClientHandler) ListChats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	chats := []chatPreview{{
		ID: 0, Username: "Поддержка", IsSupport: true, AvatarURL: "",
	}}

	if h.mongoDB == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(chats)
		return
	}

	cursor, _ := h.mongoDB.Collection("friends").Find(r.Context(), bson.M{"user_id": userID})
	defer cursor.Close(r.Context())
	for cursor.Next(r.Context()) {
		var f bson.M
		if cursor.Decode(&f) != nil {
			continue
		}
		fid := bsonInt(f["friend_id"])
		u, err := h.userRepo.FindByID(r.Context(), fid)
		if err != nil || u == nil || u.Role != models.RoleUser {
			continue
		}
		avatar := ""
		var mu models.UserMongo
		_ = h.mongoDB.Collection("users").FindOne(r.Context(), bson.M{"id": fid}).Decode(&mu)
		avatar = mu.AvatarURL
		chats = append(chats, chatPreview{ID: fid, Username: u.Username, AvatarURL: avatar})
	}

	search := r.URL.Query().Get("search")
	if search != "" {
		filtered := []chatPreview{chats[0]}
		for _, c := range chats[1:] {
			if containsIgnoreCase(c.Username, search) {
				filtered = append(filtered, c)
			}
		}
		chats = filtered
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chats)
}

type messageView struct {
	ID         interface{} `json:"id"`
	Text       string      `json:"text"`
	ImageURL   string      `json:"image_url,omitempty"`
	FromMe     bool        `json:"from_me"`
	IsSupport  bool        `json:"is_support,omitempty"`
	CreatedAt  time.Time   `json:"created_at"`
	Username   string      `json:"username,omitempty"`
}

// GetChatMessages — сообщения чата (support id=0 или user id)
func (h *ClientHandler) GetChatMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	peerID, err := strconv.Atoi(vars["peer_id"])
	if err != nil {
		http.Error(w, "Invalid peer id", http.StatusBadRequest)
		return
	}

	var out []messageView

	if peerID == supportChatID {
		msgs, err := h.supportRepo.GetMessages(r.Context(), userID, 200, 0)
		if err != nil {
			http.Error(w, "Failed to load messages", http.StatusInternalServerError)
			return
		}
		for _, m := range msgs {
			text, img := parseImageFromMessage(m.Message)
			out = append(out, messageView{
				ID: m.ID, Text: text, ImageURL: img,
				FromMe: m.IsFromUser, IsSupport: true, CreatedAt: m.CreatedAt,
			})
		}
	} else {
		if !h.getFriendIDSet(r.Context(), userID)[peerID] {
			http.Error(w, "Not friends", http.StatusForbidden)
			return
		}
		filter := bson.M{
			"$or": []bson.M{
				{"from_user_id": userID, "to_user_id": peerID},
				{"from_user_id": peerID, "to_user_id": userID},
			},
		}
		opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}).SetLimit(200)
		cursor, err := h.mongoDB.Collection("direct_messages").Find(r.Context(), filter, opts)
		if err != nil {
			http.Error(w, "Failed to load messages", http.StatusInternalServerError)
			return
		}
		defer cursor.Close(r.Context())
		for cursor.Next(r.Context()) {
			var dm models.DirectMessageMongo
			if cursor.Decode(&dm) != nil {
				continue
			}
			out = append(out, messageView{
				ID: dm.ID, Text: dm.Text, ImageURL: dm.ImageURL,
				FromMe: dm.FromUserID == userID, CreatedAt: dm.CreatedAt,
			})
		}
	}

	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})

	if out == nil {
		out = []messageView{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// SendChatMessage — отправить сообщение
func (h *ClientHandler) SendChatMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	peerID, err := strconv.Atoi(vars["peer_id"])
	if err != nil {
		http.Error(w, "Invalid peer id", http.StatusBadRequest)
		return
	}

	var req struct {
		Text     string `json:"text"`
		ImageURL string `json:"image_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Text == "" && req.ImageURL == "" {
		http.Error(w, "Message or image required", http.StatusBadRequest)
		return
	}

	now := time.Now()

	if peerID == supportChatID {
		msg := &models.SupportMessage{
			UserID: userID, Message: messageWithImage(req.Text, req.ImageURL),
			IsFromUser: true, IsRead: false, CreatedAt: now,
		}
		if err := h.supportRepo.Create(r.Context(), msg); err != nil {
			http.Error(w, "Failed to send", http.StatusInternalServerError)
			return
		}
		text, img := parseImageFromMessage(msg.Message)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(messageView{
			ID: msg.ID, Text: text, ImageURL: img, FromMe: true, IsSupport: true, CreatedAt: msg.CreatedAt,
		})
		return
	}

	if !h.getFriendIDSet(r.Context(), userID)[peerID] {
		http.Error(w, "Not friends", http.StatusForbidden)
		return
	}

	dm := models.DirectMessageMongo{
		ID: newMongoID(), FromUserID: userID, ToUserID: peerID,
		Text: req.Text, ImageURL: req.ImageURL, CreatedAt: now,
	}
	if _, err := h.mongoDB.Collection("direct_messages").InsertOne(r.Context(), dm); err != nil {
		http.Error(w, "Failed to send", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(messageView{
		ID: dm.ID, Text: dm.Text, ImageURL: dm.ImageURL, FromMe: true, CreatedAt: dm.CreatedAt,
	})
}
