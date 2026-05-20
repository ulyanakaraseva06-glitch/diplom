package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type teamMemberView struct {
	ID              int    `json:"id"`
	Username        string `json:"username"`
	AvatarURL       string `json:"avatar_url"`
	IsLeader        bool   `json:"is_leader"`
	HasSubscription bool   `json:"has_subscription"`
}

type teamView struct {
	ID         string           `json:"id"`
	ChatPeerID int              `json:"chat_peer_id"`
	Name       string           `json:"name"`
	AvatarURL  string           `json:"avatar_url"`
	LeaderID   int              `json:"leader_id"`
	Members    []teamMemberView `json:"members"`
	IsLeader   bool             `json:"is_leader"`
}

func (h *ClientHandler) nextTeamChatPeerID(ctx context.Context) (int, error) {
	var doc struct {
		N int `bson:"n"`
	}
	err := h.mongoDB.Collection("counters").FindOneAndUpdate(
		ctx,
		bson.M{"_id": "team_chat"},
		bson.M{"$inc": bson.M{"n": 1}},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	).Decode(&doc)
	if err != nil {
		return 0, err
	}
	return -doc.N, nil
}

func (h *ClientHandler) findTeamByID(ctx context.Context, teamID string) (*models.TeamMongo, error) {
	var t models.TeamMongo
	err := h.mongoDB.Collection("teams").FindOne(ctx, bson.M{"id": teamID}).Decode(&t)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (h *ClientHandler) isTeamMember(t *models.TeamMongo, userID int) bool {
	if t.LeaderID == userID {
		return true
	}
	for _, id := range t.MemberIDs {
		if id == userID {
			return true
		}
	}
	return false
}

func (h *ClientHandler) teamToView(ctx context.Context, t *models.TeamMongo, userID int) teamView {
	h.ensureTeamSubscriptionsForTeam(ctx, t.ID)
	memberIDs := teamMemberIDs(t)
	subMap := h.subscriptionStatusMap(ctx, memberIDs)
	members := make([]teamMemberView, 0, len(memberIDs))
	for _, mid := range memberIDs {
		u, _ := h.userRepo.FindByID(ctx, mid)
		if u == nil {
			continue
		}
		avatar := h.mongoAvatarURL(ctx, mid)
		members = append(members, teamMemberView{
			ID: mid, Username: u.Username, AvatarURL: avatar, IsLeader: mid == t.LeaderID,
			HasSubscription: subMap[mid],
		})
	}
	return teamView{
		ID: t.ID, ChatPeerID: t.ChatPeerID, Name: t.Name, AvatarURL: t.AvatarURL,
		LeaderID: t.LeaderID, Members: members, IsLeader: t.LeaderID == userID,
	}
}

func (h *ClientHandler) mongoAvatarURL(ctx context.Context, userID int) string {
	if h.mongoDB == nil {
		return ""
	}
	p, err := h.loadMongoProfile(ctx, userID)
	if err != nil {
		return ""
	}
	return p.AvatarURL
}

// ListTeams — команды текущего пользователя
func (h *ClientHandler) ListTeams(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]teamView{})
		return
	}

	cursor, err := h.mongoDB.Collection("teams").Find(r.Context(), bson.M{"member_ids": userID})
	if err != nil {
		http.Error(w, "Failed to list teams", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(r.Context())

	out := make([]teamView, 0)
	for cursor.Next(r.Context()) {
		var t models.TeamMongo
		if cursor.Decode(&t) != nil {
			continue
		}
		out = append(out, h.teamToView(r.Context(), &t, userID))
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// CreateTeam — создать команду (лидер = текущий пользователь)
func (h *ClientHandler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		http.Error(w, "MongoDB unavailable", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
		MemberIDs []int  `json:"member_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	friends := h.getFriendIDSet(r.Context(), userID)
	members := []int{userID}
	seen := map[int]bool{userID: true}
	for _, mid := range req.MemberIDs {
		if mid == userID || seen[mid] {
			continue
		}
		if !friends[mid] {
			continue
		}
		u, _ := h.userRepo.FindByID(r.Context(), mid)
		if u == nil || u.Role != models.RoleUser {
			continue
		}
		members = append(members, mid)
		seen[mid] = true
	}

	chatPeerID, err := h.nextTeamChatPeerID(r.Context())
	if err != nil {
		http.Error(w, "Failed to create team chat", http.StatusInternalServerError)
		return
	}

	team := models.TeamMongo{
		ID: newMongoID(), ChatPeerID: chatPeerID, Name: req.Name, AvatarURL: req.AvatarURL,
		LeaderID: userID, MemberIDs: members, CreatedAt: time.Now(),
	}
	if _, err := h.mongoDB.Collection("teams").InsertOne(r.Context(), team); err != nil {
		log.Printf("CreateTeam: %v", err)
		http.Error(w, "Failed to create team", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(h.teamToView(r.Context(), &team, userID))
}

// UpdateTeam — изменить команду (только лидер)
func (h *ClientHandler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		http.Error(w, "MongoDB unavailable", http.StatusServiceUnavailable)
		return
	}

	teamID := mux.Vars(r)["team_id"]
	team, err := h.findTeamByID(r.Context(), teamID)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "Team not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if team.LeaderID != userID {
		http.Error(w, "Only leader can edit team", http.StatusForbidden)
		return
	}

	var req struct {
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
		MemberIDs []int  `json:"member_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	oldMembers := append([]int(nil), team.MemberIDs...)

	friends := h.getFriendIDSet(r.Context(), userID)
	members := []int{userID}
	seen := map[int]bool{userID: true}
	for _, mid := range req.MemberIDs {
		if mid == userID || seen[mid] {
			continue
		}
		if !friends[mid] {
			continue
		}
		u, _ := h.userRepo.FindByID(r.Context(), mid)
		if u == nil || u.Role != models.RoleUser {
			continue
		}
		members = append(members, mid)
		seen[mid] = true
	}

	set := bson.M{"member_ids": members}
	if req.Name != "" {
		set["name"] = req.Name
	}
	if req.AvatarURL != "" {
		set["avatar_url"] = req.AvatarURL
	}

	_, err = h.mongoDB.Collection("teams").UpdateOne(r.Context(), bson.M{"id": teamID}, bson.M{"$set": set})
	if err != nil {
		http.Error(w, "Failed to update team", http.StatusInternalServerError)
		return
	}

	if req.AvatarURL != "" {
		team.AvatarURL = req.AvatarURL
	}
	team.MemberIDs = members
	h.syncTeamSubscriptionMembers(r.Context(), teamID, oldMembers, members)

	updated, err := h.findTeamByID(r.Context(), teamID)
	if err != nil {
		http.Error(w, "Failed to load team", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.teamToView(r.Context(), updated, userID))
}

func (h *ClientHandler) findTeamByChatPeerID(ctx context.Context, peerID int) (*models.TeamMongo, error) {
	var t models.TeamMongo
	err := h.mongoDB.Collection("teams").FindOne(ctx, bson.M{"chat_peer_id": peerID}).Decode(&t)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
