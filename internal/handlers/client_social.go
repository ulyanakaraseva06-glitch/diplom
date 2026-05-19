package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"esports-manager/internal/middleware"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RemoveFriend — удалить из друзей (с обеих сторон) и переписку
func (h *ClientHandler) RemoveFriend(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		http.Error(w, "MongoDB unavailable", http.StatusServiceUnavailable)
		return
	}

	friendID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil || friendID <= 0 {
		http.Error(w, "Invalid friend id", http.StatusBadRequest)
		return
	}
	if !h.getFriendIDSet(r.Context(), userID)[friendID] {
		http.Error(w, "Not friends", http.StatusNotFound)
		return
	}

	ctx := r.Context()
	_, _ = h.mongoDB.Collection("friends").DeleteMany(ctx, bson.M{
		"$or": []bson.M{
			{"user_id": userID, "friend_id": friendID},
			{"user_id": friendID, "friend_id": userID},
		},
	})
	_, _ = h.mongoDB.Collection("direct_messages").DeleteMany(ctx, bson.M{
		"$or": []bson.M{
			{"from_user_id": userID, "to_user_id": friendID},
			{"from_user_id": friendID, "to_user_id": userID},
		},
	})
	_, _ = h.mongoDB.Collection("hidden_chats").DeleteMany(ctx, bson.M{
		"$or": []bson.M{
			{"user_id": userID, "peer_id": friendID},
			{"user_id": friendID, "peer_id": userID},
		},
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Friend removed"})
}

func (h *ClientHandler) hiddenPeerSet(ctx context.Context, userID int) map[int]bool {
	out := map[int]bool{}
	if h.mongoDB == nil {
		return out
	}
	cur, err := h.mongoDB.Collection("hidden_chats").Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return out
	}
	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var doc bson.M
		if cur.Decode(&doc) != nil {
			continue
		}
		out[bsonInt(doc["peer_id"])] = true
	}
	return out
}

func (h *ClientHandler) hideChat(ctx context.Context, userID, peerID int, extra bson.M) error {
	doc := bson.M{"user_id": userID, "peer_id": peerID}
	for k, v := range extra {
		doc[k] = v
	}
	_, err := h.mongoDB.Collection("hidden_chats").UpdateOne(ctx,
		bson.M{"user_id": userID, "peer_id": peerID},
		bson.M{"$set": doc},
		options.Update().SetUpsert(true),
	)
	return err
}

// DeleteChat — удалить/скрыть чат для текущего пользователя
func (h *ClientHandler) DeleteChat(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		http.Error(w, "MongoDB unavailable", http.StatusServiceUnavailable)
		return
	}

	peerID, err := strconv.Atoi(mux.Vars(r)["peer_id"])
	if err != nil {
		http.Error(w, "Invalid peer id", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	if peerID == supportChatID {
		http.Error(w, "Чат поддержки нельзя удалить", http.StatusBadRequest)
		return
	}

	if peerID < 0 {
		team, err := h.findTeamByChatPeerID(ctx, peerID)
		if err != nil || !h.isTeamMember(team, userID) {
			http.Error(w, "Team not found", http.StatusForbidden)
			return
		}
		if err := h.hideChat(ctx, userID, peerID, bson.M{"team_id": team.ID}); err != nil {
			log.Printf("DeleteChat team hide: %v", err)
			http.Error(w, "Failed to hide chat", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Chat hidden"})
		return
	}

	if !h.getFriendIDSet(ctx, userID)[peerID] {
		http.Error(w, "Not friends", http.StatusForbidden)
		return
	}

	_, _ = h.mongoDB.Collection("direct_messages").DeleteMany(ctx, bson.M{
		"$or": []bson.M{
			{"from_user_id": userID, "to_user_id": peerID},
			{"from_user_id": peerID, "to_user_id": userID},
		},
	})
	if err := h.hideChat(ctx, userID, peerID, nil); err != nil {
		log.Printf("DeleteChat hide: %v", err)
		http.Error(w, "Failed to delete chat", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Chat deleted"})
}
