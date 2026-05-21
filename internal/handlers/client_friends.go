package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type friendUserView struct {
	ID              int    `json:"id"`
	Username        string `json:"username"`
	Email           string `json:"email"`
	AvatarURL       string `json:"avatar_url"`
	HasSubscription bool   `json:"has_subscription"`
}

func (h *ClientHandler) enrichUsers(ctx context.Context, ids []int) []friendUserView {
	subMap := h.subscriptionStatusMap(ctx, ids)
	result := make([]friendUserView, 0, len(ids))
	for _, id := range ids {
		u, err := h.userRepo.FindByID(ctx, id)
		if err != nil || u == nil {
			continue
		}
		avatar := ""
		if h.mongoDB != nil {
			avatar = h.mongoAvatarURL(ctx, id)
		}
		result = append(result, friendUserView{
			ID: id, Username: u.Username, Email: u.Email, AvatarURL: avatar,
			HasSubscription: subMap[id],
		})
	}
	return result
}

// ListPlayers — поиск игроков (role=user)
func (h *ClientHandler) ListPlayers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	search := r.URL.Query().Get("search")
	users, err := h.userRepo.ListPlayers(r.Context(), search, userID, 100)
	if err != nil {
		http.Error(w, "Failed to list users", http.StatusInternalServerError)
		return
	}

	friendIDs := h.getFriendIDSet(r.Context(), userID)
	pending := h.getPendingRequestPairs(r.Context(), userID)

	type playerView struct {
		friendUserView
		Status string `json:"status"` // none, friend, sent, incoming
	}

	ids := make([]int, len(users))
	for i, u := range users {
		ids[i] = u.ID
	}
	subMap := h.subscriptionStatusMap(r.Context(), ids)

	var out []playerView
	for _, u := range users {
		avatar := ""
		if h.mongoDB != nil {
			avatar = h.mongoAvatarURL(r.Context(), u.ID)
		}

		status := "none"
		if friendIDs[u.ID] {
			status = "friend"
		} else if pending[u.ID] != "" {
			status = pending[u.ID]
		}

		out = append(out, playerView{
			friendUserView: friendUserView{
				ID: u.ID, Username: u.Username, Email: u.Email, AvatarURL: avatar,
				HasSubscription: subMap[u.ID],
			},
			Status: status,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func (h *ClientHandler) getFriendIDSet(ctx context.Context, userID int) map[int]bool {
	set := map[int]bool{}
	cursor, err := h.mongoDB.Collection("friends").Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return set
	}
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var f bson.M
		if cursor.Decode(&f) == nil {
			set[bsonInt(f["friend_id"])] = true
		}
	}
	return set
}

func (h *ClientHandler) getPendingRequestPairs(ctx context.Context, userID int) map[int]string {
	out := map[int]string{}
	filter := bson.M{
		"status": "pending",
		"$or": []bson.M{
			{"from_user_id": userID},
			{"to_user_id": userID},
		},
	}
	cursor, err := h.mongoDB.Collection("friend_requests").Find(ctx, filter)
	if err != nil {
		return out
	}
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var fr models.FriendRequestMongo
		if cursor.Decode(&fr) != nil {
			continue
		}
		if fr.FromUserID == userID {
			out[fr.ToUserID] = "sent"
		} else {
			out[fr.FromUserID] = "incoming"
		}
	}
	return out
}

// GetFriendsDetailed — мои друзья с данными профиля
func (h *ClientHandler) GetFriendsDetailed(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	search := r.URL.Query().Get("search")
	cursor, err := h.mongoDB.Collection("friends").Find(r.Context(), bson.M{"user_id": userID})
	if err != nil {
		http.Error(w, "Failed to fetch friends", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(r.Context())

	var ids []int
	for cursor.Next(r.Context()) {
		var f bson.M
		if cursor.Decode(&f) == nil {
			ids = append(ids, bsonInt(f["friend_id"]))
		}
	}

	friends := h.enrichUsers(r.Context(), ids)
	if search != "" {
		filtered := make([]friendUserView, 0)
		for _, f := range friends {
			if containsIgnoreCase(f.Username, search) {
				filtered = append(filtered, f)
			}
		}
		friends = filtered
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(friends)
}

// GetFriendRequests — входящие и исходящие заявки
func (h *ClientHandler) GetFriendRequests(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	search := r.URL.Query().Get("search")
	filter := bson.M{
		"status": "pending",
		"$or": []bson.M{
			{"from_user_id": userID},
			{"to_user_id": userID},
		},
	}
	cursor, err := h.mongoDB.Collection("friend_requests").Find(r.Context(), filter)
	if err != nil {
		http.Error(w, "Failed to fetch requests", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(r.Context())

	type requestView struct {
		ID         string        `json:"id"`
		FromUserID int           `json:"from_user_id"`
		ToUserID   int           `json:"to_user_id"`
		Direction  string        `json:"direction"`
		CreatedAt  time.Time     `json:"created_at"`
		User       friendUserView `json:"user"`
	}

	var incoming, outgoing []requestView
	for cursor.Next(r.Context()) {
		var fr models.FriendRequestMongo
		if cursor.Decode(&fr) != nil {
			continue
		}
		otherID := fr.ToUserID
		dir := "outgoing"
		if fr.ToUserID == userID {
			otherID = fr.FromUserID
			dir = "incoming"
		}
		users := h.enrichUsers(r.Context(), []int{otherID})
		if len(users) == 0 {
			continue
		}
		if search != "" && !containsIgnoreCase(users[0].Username, search) {
			continue
		}
		rv := requestView{
			ID: fr.ID, FromUserID: fr.FromUserID, ToUserID: fr.ToUserID,
			Direction: dir, CreatedAt: fr.CreatedAt, User: users[0],
		}
		if dir == "incoming" {
			incoming = append(incoming, rv)
		} else {
			outgoing = append(outgoing, rv)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"incoming": incoming,
		"outgoing": outgoing,
	})
}

// SendFriendRequest — отправить заявку в друзья
func (h *ClientHandler) SendFriendRequest(w http.ResponseWriter, r *http.Request) {
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
	if req.FriendID == userID {
		http.Error(w, "Cannot add yourself", http.StatusBadRequest)
		return
	}

	target, err := h.userRepo.FindByID(r.Context(), req.FriendID)
	if err != nil || target == nil || target.Role != models.RoleUser {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if h.getFriendIDSet(r.Context(), userID)[req.FriendID] {
		http.Error(w, "Already friends", http.StatusConflict)
		return
	}

	switch h.getPendingRequestPairs(r.Context(), userID)[req.FriendID] {
	case "incoming":
		http.Error(w, "Incoming friend request pending", http.StatusConflict)
		return
	case "sent":
		http.Error(w, "Friend request already sent", http.StatusConflict)
		return
	}

	reqID := newMongoID()
	fr := models.FriendRequestMongo{
		ID: reqID, FromUserID: userID, ToUserID: req.FriendID,
		Status: "pending", CreatedAt: time.Now(),
	}
	if _, err := h.mongoDB.Collection("friend_requests").InsertOne(r.Context(), fr); err != nil {
		http.Error(w, "Failed to send request", http.StatusInternalServerError)
		return
	}

	fromUser, _ := h.userRepo.FindByID(r.Context(), userID)
	fromName := "Пользователь"
	if fromUser != nil {
		fromName = fromUser.Username
	}
	h.createNotification(r.Context(), req.FriendID, "friend_request", "Заявка в друзья",
		fromName+" отправил(а) вам заявку в друзья", reqID)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Request sent", "id": reqID})
}

// RespondFriendRequest — принять или отклонить заявку
func (h *ClientHandler) RespondFriendRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		RequestID string `json:"request_id"`
		Accept    bool   `json:"accept"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var fr models.FriendRequestMongo
	err := h.mongoDB.Collection("friend_requests").FindOne(r.Context(), bson.M{"id": req.RequestID}).Decode(&fr)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "Request not found", http.StatusNotFound)
		return
	}
	if fr.Status != "pending" || fr.ToUserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	status := "rejected"
	if req.Accept {
		status = "accepted"
	}
	_, _ = h.mongoDB.Collection("friend_requests").UpdateOne(r.Context(),
		bson.M{"id": req.RequestID},
		bson.M{"$set": bson.M{"status": status}},
	)

	if req.Accept {
		now := time.Now()
		_, _ = h.mongoDB.Collection("friends").InsertOne(r.Context(), bson.M{
			"user_id": userID, "friend_id": fr.FromUserID, "created_at": now,
		})
		_, _ = h.mongoDB.Collection("friends").InsertOne(r.Context(), bson.M{
			"user_id": fr.FromUserID, "friend_id": userID, "created_at": now,
		})
		toName := "Пользователь"
		if u, _ := h.userRepo.FindByID(r.Context(), userID); u != nil {
			toName = u.Username
		}
		h.createNotification(r.Context(), fr.FromUserID, "friend_accepted", "Заявка принята",
			toName+" принял(а) вашу заявку в друзья", req.RequestID)
		syncFriendshipToNeo4j(r.Context(), h.neo4jClient, userID, fr.FromUserID, true)
	}

	json.NewEncoder(w).Encode(map[string]string{"status": status})
}

func (h *ClientHandler) createNotification(ctx context.Context, userID int, nType, title, body, refID string) {
	n := models.NotificationMongo{
		ID: newMongoID(), UserID: userID, Type: nType,
		Title: title, Body: body, RefID: refID,
		IsRead: false, CreatedAt: time.Now(),
	}
	_, _ = h.mongoDB.Collection("notifications").InsertOne(ctx, n)
}

// GetNotifications — уведомления пользователя
func (h *ClientHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	cursor, err := h.mongoDB.Collection("notifications").Find(r.Context(),
		bson.M{"user_id": userID},
	)
	if err != nil {
		http.Error(w, "Failed to fetch notifications", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(r.Context())

	var list []models.NotificationMongo
	_ = cursor.All(r.Context(), &list)
	if list == nil {
		list = []models.NotificationMongo{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func containsIgnoreCase(s, sub string) bool {
	if sub == "" {
		return true
	}
	return len(s) >= len(sub) && (s == sub || len(sub) > 0 && searchFold(s, sub))
}

func searchFold(s, sub string) bool {
	// простой contains без unicode fold
	for i := 0; i+len(sub) <= len(s); i++ {
		match := true
		for j := 0; j < len(sub); j++ {
			a, b := s[i+j], sub[j]
			if a >= 'A' && a <= 'Z' {
				a += 32
			}
			if b >= 'A' && b <= 'Z' {
				b += 32
			}
			if a != b {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}
