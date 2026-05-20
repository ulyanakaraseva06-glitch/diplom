package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type teamSubscriptionMeta struct {
	SubscriptionID string
	TeamID         string
	StartDate      time.Time
	EndDate        time.Time
}

func isTeamSubscriptionPlan(sub models.Subscription) bool {
	return sub.TargetType == "team" || sub.ID == "sub_team"
}

// teamMemberIDs — все участники команды (лидер всегда включён).
func teamMemberIDs(team *models.TeamMongo) []int {
	if team == nil {
		return nil
	}
	seen := make(map[int]bool)
	var ids []int
	if team.LeaderID != 0 {
		ids = append(ids, team.LeaderID)
		seen[team.LeaderID] = true
	}
	for _, id := range team.MemberIDs {
		if id != 0 && !seen[id] {
			ids = append(ids, id)
			seen[id] = true
		}
	}
	return ids
}

func subscriptionPlanFallback(subscriptionID string) models.Subscription {
	name := subscriptionID
	targetType := "user"
	switch subscriptionID {
	case "sub_team":
		name = "Для команды"
		targetType = "team"
	case "sub_user":
		name = "Для пользователя"
	case "sub_organizer":
		name = "Для организатора"
		targetType = "organizer"
	}
	return models.Subscription{ID: subscriptionID, Name: name, TargetType: targetType}
}

type subscriptionPayRequest struct {
	SubscriptionID string `json:"subscription_id"`
	TeamID         string `json:"team_id,omitempty"`
}

// SubscribeWithBalance — оплата подписки с кошелька.
func (h *ClientHandler) SubscribeWithBalance(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if h.mongoDB == nil {
		http.Error(w, "MongoDB unavailable", http.StatusServiceUnavailable)
		return
	}

	var req subscriptionPayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.SubscriptionID == "" {
		http.Error(w, "subscription_id required", http.StatusBadRequest)
		return
	}

	var subscription models.Subscription
	err := h.mongoDB.Collection("subscriptions").FindOne(r.Context(), bson.M{"id": req.SubscriptionID}).Decode(&subscription)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "Подписка не найдена", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	role, _ := middleware.GetUserRole(r.Context())
	if err := h.validateSubscriptionPurchase(r, userID, role, subscription, req.TeamID); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	balance := h.getUserBalance(r.Context(), userID)
	price := float64(subscription.Price)
	if balance < price {
		http.Error(w, "Недостаточно средств на кошельке", http.StatusPaymentRequired)
		return
	}

	if err := h.setUserBalance(r.Context(), userID, balance-price); err != nil {
		http.Error(w, "Не удалось списать средства", http.StatusInternalServerError)
		return
	}

	var userSub models.UserSubscription
	if isTeamSubscriptionPlan(subscription) {
		if req.TeamID == "" {
			_ = h.setUserBalance(r.Context(), userID, balance)
			http.Error(w, "укажите команду", http.StatusBadRequest)
			return
		}
		userSub, err = h.activateTeamSubscription(r.Context(), userID, subscription, req.TeamID)
	} else {
		userSub, err = h.activatePersonalSubscription(r.Context(), userID, subscription)
	}
	if err != nil {
		_ = h.setUserBalance(r.Context(), userID, balance)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	msg := fmt.Sprintf("Подписка «%s» успешно оплачена с кошелька.", subscription.Name)
	if isTeamSubscriptionPlan(subscription) {
		team, _ := h.findTeamByID(r.Context(), req.TeamID)
		teamName := req.TeamID
		memberCount := 0
		if team != nil {
			teamName = team.Name
			memberCount = len(teamMemberIDs(team))
		}
		msg = fmt.Sprintf("Командная подписка «%s» оплачена для команды «%s». VIP активирован для %d участников.",
			subscription.Name, teamName, memberCount)
	}
	h.notifyUser(r.Context(), userID, "subscription_paid", "Оплата подтверждена", msg, userSub.ID)

	h.ensureTeamSubscriptionsForTeam(r.Context(), req.TeamID)
	mySubs, _ := h.buildAllActiveSubscriptionViews(r.Context(), userID)

	w.Header().Set("Content-Type", "application/json")
	payload := map[string]interface{}{
		"message":      msg,
		"balance":      balance - price,
		"subscription": userSub,
	}
	if mySubs != nil {
		payload["subscriptions"] = mySubs.Subscriptions
		payload["has_personal"] = mySubs.HasPersonal
		payload["has_team"] = mySubs.HasTeam
		payload["has_active"] = mySubs.HasActive
	}
	json.NewEncoder(w).Encode(payload)
}

func (h *ClientHandler) validateSubscriptionPurchase(r *http.Request, userID int, role string, sub models.Subscription, teamID string) error {
	if isTeamSubscriptionPlan(sub) {
		if teamID == "" {
			return fmt.Errorf("укажите команду")
		}
		team, err := h.findTeamByID(r.Context(), teamID)
		if err != nil {
			return fmt.Errorf("команда не найдена")
		}
		if team.LeaderID != userID {
			return fmt.Errorf("командную подписку может оформить только лидер")
		}
		if !h.isTeamMember(team, userID) && team.LeaderID != userID {
			return fmt.Errorf("вы не состоите в этой команде")
		}
		return nil
	}
	switch sub.TargetType {
	case "organizer":
		if role != "organizer" {
			return fmt.Errorf("подписка доступна только организаторам")
		}
	case "user":
		if role == "manager" {
			return fmt.Errorf("менеджеру эта подписка недоступна")
		}
	default:
		return fmt.Errorf("неизвестный тип подписки")
	}
	return nil
}

func (h *ClientHandler) activatePersonalSubscription(ctx context.Context, userID int, sub models.Subscription) (models.UserSubscription, error) {
	_, _ = h.mongoDB.Collection("user_subscriptions").UpdateMany(
		ctx,
		bson.M{"user_id": userID, "is_active": true, "source": "self"},
		bson.M{"$set": bson.M{"is_active": false}},
	)

	userSub := models.UserSubscription{
		ID:             newDepositID(),
		UserID:         userID,
		SubscriptionID: sub.ID,
		Source:         "self",
		StartDate:      time.Now(),
		EndDate:        time.Now().AddDate(0, 1, 0),
		IsActive:       true,
		AutoRenew:      false,
	}
	if _, err := h.mongoDB.Collection("user_subscriptions").InsertOne(ctx, userSub); err != nil {
		return models.UserSubscription{}, fmt.Errorf("не удалось активировать подписку")
	}
	return userSub, nil
}

func (h *ClientHandler) deactivateTeamSubscriptions(ctx context.Context, teamID string, memberIDs []int) {
	if len(memberIDs) == 0 {
		return
	}
	_, _ = h.mongoDB.Collection("user_subscriptions").UpdateMany(ctx, bson.M{
		"user_id":   bson.M{"$in": memberIDs},
		"is_active": true,
		"$or": []bson.M{
			{"team_id": teamID},
			{"subscription_id": "sub_team", "team_id": bson.M{"$in": []interface{}{teamID, "", nil}}},
			{"source": "team", "team_id": teamID},
		},
	}, bson.M{"$set": bson.M{"is_active": false, "auto_renew": false}})
}

func (h *ClientHandler) activateTeamSubscription(ctx context.Context, leaderID int, sub models.Subscription, teamID string) (models.UserSubscription, error) {
	team, err := h.findTeamByID(ctx, teamID)
	if err != nil {
		return models.UserSubscription{}, fmt.Errorf("команда не найдена")
	}

	members := teamMemberIDs(team)
	if len(members) == 0 {
		return models.UserSubscription{}, fmt.Errorf("в команде нет участников")
	}

	h.deactivateTeamSubscriptions(ctx, teamID, members)

	now := time.Now()
	end := now.AddDate(0, 1, 0)
	var leaderSub models.UserSubscription

	subID := sub.ID
	if subID == "" {
		subID = "sub_team"
	}
	meta := &teamSubscriptionMeta{
		SubscriptionID: subID,
		TeamID:         teamID,
		StartDate:      now,
		EndDate:        end,
	}
	for _, memberID := range members {
		userSub, err := h.grantTeamSubscriptionMember(ctx, memberID, meta, memberID != leaderID)
		if err != nil {
			return models.UserSubscription{}, err
		}
		if memberID == leaderID {
			leaderSub = userSub
		}
	}
	h.repairTeamSubscriptionMembers(ctx, teamID, meta)
	return leaderSub, nil
}

// HasActiveSubscription — есть ли личная или командная активная подписка.
func (h *ClientHandler) HasActiveSubscription(ctx context.Context, userID int) bool {
	if h.mongoDB == nil {
		return false
	}
	h.ensureUserTeamSubscriptions(ctx, userID)
	count, err := h.mongoDB.Collection("user_subscriptions").CountDocuments(ctx, bson.M{
		"user_id":   userID,
		"is_active": true,
		"end_date":  bson.M{"$gt": time.Now()},
	})
	return err == nil && count > 0
}

type mySubscriptionsResponse struct {
	Subscriptions []userSubscriptionView `json:"subscriptions"`
	HasPersonal   bool                   `json:"has_personal"`
	HasTeam       bool                   `json:"has_team"`
	HasActive     bool                   `json:"has_active"`
}

// GetUserSubscription — все активные подписки пользователя (личная и командная).
func (h *ClientHandler) GetUserSubscription(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if h.mongoDB == nil {
		w.Write([]byte(`{"subscriptions":[],"has_personal":false,"has_team":false,"has_active":false}`))
		return
	}

	h.ensureUserTeamSubscriptions(r.Context(), userID)
	resp, err := h.buildAllActiveSubscriptionViews(r.Context(), userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(resp)
}

type userSubscriptionView struct {
	models.UserSubscription
	SubscriptionName string `json:"subscription_name"`
	TargetType       string `json:"target_type"`
	TeamName         string `json:"team_name,omitempty"`
	CanCancel        bool   `json:"can_cancel"`
}

func (h *ClientHandler) buildAllActiveSubscriptionViews(ctx context.Context, userID int) (*mySubscriptionsResponse, error) {
	now := time.Now()
	cursor, err := h.mongoDB.Collection("user_subscriptions").Find(ctx, bson.M{
		"user_id":   userID,
		"is_active": true,
		"end_date":  bson.M{"$gt": now},
	}, options.Find().SetSort(bson.D{{Key: "end_date", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	resp := &mySubscriptionsResponse{Subscriptions: []userSubscriptionView{}}
	seen := map[string]bool{}

	for cursor.Next(ctx) {
		var userSub models.UserSubscription
		if err := cursor.Decode(&userSub); err != nil {
			continue
		}
		view, ok := h.viewFromUserSubscription(ctx, userID, userSub)
		if !ok {
			continue
		}
		if seen[userSub.ID] {
			continue
		}
		seen[userSub.ID] = true
		resp.Subscriptions = append(resp.Subscriptions, view)
		isTeam := view.Source == "team" || view.TeamID != "" || view.TargetType == "team"
		if isTeam {
			resp.HasTeam = true
		} else {
			resp.HasPersonal = true
		}
	}
	resp.HasActive = len(resp.Subscriptions) > 0
	return resp, nil
}

func (h *ClientHandler) viewFromUserSubscription(ctx context.Context, userID int, userSub models.UserSubscription) (userSubscriptionView, bool) {
	var sub models.Subscription
	if err := h.mongoDB.Collection("subscriptions").FindOne(ctx, bson.M{"id": userSub.SubscriptionID}).Decode(&sub); err != nil {
		sub = subscriptionPlanFallback(userSub.SubscriptionID)
	}

	source := userSub.Source
	if source == "" {
		if userSub.TeamID != "" {
			source = "team"
		} else {
			source = "self"
		}
	}

	userSub.Source = source
	view := userSubscriptionView{
		UserSubscription: userSub,
		SubscriptionName: sub.Name,
		TargetType:       sub.TargetType,
		CanCancel:        source == "self",
	}
	if userSub.TeamID != "" {
		if team, err := h.findTeamByID(ctx, userSub.TeamID); err == nil {
			view.TeamName = team.Name
			if team.LeaderID == userID {
				view.CanCancel = true
			}
		}
	}
	return view, true
}

type cancelSubscriptionRequest struct {
	UserSubscriptionID string `json:"user_subscription_id"`
}

// CancelSubscription — отмена личной или командной (лидер) подписки.
func (h *ClientHandler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req cancelSubscriptionRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	var active models.UserSubscription
	findFilter := bson.M{"user_id": userID, "is_active": true, "end_date": bson.M{"$gt": time.Now()}}
	if req.UserSubscriptionID != "" {
		findFilter = bson.M{"id": req.UserSubscriptionID, "user_id": userID, "is_active": true}
	}
	err := h.mongoDB.Collection("user_subscriptions").FindOne(r.Context(), findFilter).Decode(&active)
	if err == mongo.ErrNoDocuments {
		http.Error(w, "Активная подписка не найдена", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	source := active.Source
	if source == "" && active.TeamID != "" {
		source = "team"
	}
	filter := bson.M{"user_id": userID, "is_active": true, "source": "self"}
	if source == "team" && active.TeamID != "" {
		team, err := h.findTeamByID(r.Context(), active.TeamID)
		if err != nil || team.LeaderID != userID {
			http.Error(w, "Отменить командную подписку может только лидер", http.StatusForbidden)
			return
		}
		filter = bson.M{"team_id": active.TeamID, "is_active": true, "source": "team"}
	}

	_, err = h.mongoDB.Collection("user_subscriptions").UpdateMany(
		r.Context(),
		filter,
		bson.M{"$set": bson.M{"is_active": false, "auto_renew": false}},
	)
	if err != nil {
		http.Error(w, "Failed to cancel subscription", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Подписка отменена"})
}

func (h *ClientHandler) subscriptionStatusMap(ctx context.Context, userIDs []int) map[int]bool {
	out := make(map[int]bool)
	if h.mongoDB == nil || len(userIDs) == 0 {
		return out
	}
	for _, uid := range userIDs {
		h.ensureUserTeamSubscriptions(ctx, uid)
	}
	cursor, err := h.mongoDB.Collection("user_subscriptions").Find(ctx, bson.M{
		"user_id":   bson.M{"$in": userIDs},
		"is_active": true,
		"end_date":  bson.M{"$gt": time.Now()},
	})
	if err != nil {
		return out
	}
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var s models.UserSubscription
		if cursor.Decode(&s) == nil {
			out[s.UserID] = true
		}
	}
	return out
}

func (h *ClientHandler) getActiveTeamSubscriptionMeta(ctx context.Context, teamID string) (*teamSubscriptionMeta, bool) {
	now := time.Now()
	sort := options.FindOne().SetSort(bson.D{{Key: "end_date", Value: -1}})

	var sub models.UserSubscription
	err := h.mongoDB.Collection("user_subscriptions").FindOne(ctx, bson.M{
		"team_id": teamID,
		"is_active": true,
		"end_date":  bson.M{"$gt": now},
	}, sort).Decode(&sub)
	if err != nil {
		team, tErr := h.findTeamByID(ctx, teamID)
		members := teamMemberIDs(team)
		if tErr != nil || len(members) == 0 {
			return nil, false
		}
		err = h.mongoDB.Collection("user_subscriptions").FindOne(ctx, bson.M{
			"user_id":         bson.M{"$in": members},
			"subscription_id": "sub_team",
			"is_active":       true,
			"end_date":        bson.M{"$gt": now},
		}, sort).Decode(&sub)
		if err != nil {
			return nil, false
		}
	}
	return &teamSubscriptionMeta{
		SubscriptionID: sub.SubscriptionID,
		TeamID:         teamID,
		StartDate:      sub.StartDate,
		EndDate:        sub.EndDate,
	}, true
}

func (h *ClientHandler) syncTeamSubscriptionMembers(ctx context.Context, teamID string, oldMembers, newMembers []int) {
	if h.mongoDB == nil {
		return
	}
	meta, ok := h.getActiveTeamSubscriptionMeta(ctx, teamID)
	if !ok {
		return
	}

	oldSet := make(map[int]bool, len(oldMembers))
	for _, id := range oldMembers {
		oldSet[id] = true
	}
	newSet := make(map[int]bool, len(newMembers))
	for _, id := range newMembers {
		newSet[id] = true
	}

	for id := range oldSet {
		if !newSet[id] {
			h.revokeTeamSubscriptionMember(ctx, id, teamID)
		}
	}
	for id := range newSet {
		if !oldSet[id] {
			_, _ = h.grantTeamSubscriptionMember(ctx, id, meta, true)
		}
	}
}

func (h *ClientHandler) revokeTeamSubscriptionMember(ctx context.Context, userID int, teamID string) {
	_, _ = h.mongoDB.Collection("user_subscriptions").UpdateMany(ctx, bson.M{
		"user_id":   userID,
		"team_id":   teamID,
		"source":    "team",
		"is_active": true,
	}, bson.M{"$set": bson.M{"is_active": false, "auto_renew": false}})
}

func (h *ClientHandler) grantTeamSubscriptionMember(ctx context.Context, userID int, meta *teamSubscriptionMeta, notify bool) (models.UserSubscription, error) {
	if h.userHasActiveTeamSub(ctx, userID, meta.TeamID) {
		var existing models.UserSubscription
		now := time.Now()
		_ = h.mongoDB.Collection("user_subscriptions").FindOne(ctx, bson.M{
			"user_id":   userID,
			"is_active": true,
			"end_date":  bson.M{"$gt": now},
			"$or": []bson.M{
				{"team_id": meta.TeamID},
				{"subscription_id": "sub_team", "team_id": meta.TeamID},
			},
		}).Decode(&existing)
		if existing.TeamID == "" && meta.TeamID != "" {
			_, _ = h.mongoDB.Collection("user_subscriptions").UpdateOne(ctx,
				bson.M{"id": existing.ID},
				bson.M{"$set": bson.M{"team_id": meta.TeamID, "source": "team"}},
			)
			existing.TeamID = meta.TeamID
			existing.Source = "team"
		}
		return existing, nil
	}

	_, _ = h.mongoDB.Collection("user_subscriptions").UpdateMany(ctx, bson.M{
		"user_id": userID,
		"is_active": true,
		"$or": []bson.M{
			{"team_id": meta.TeamID},
			{"subscription_id": "sub_team", "team_id": bson.M{"$in": []interface{}{meta.TeamID, "", nil}}},
		},
	}, bson.M{"$set": bson.M{"is_active": false, "auto_renew": false}})

	team, _ := h.findTeamByID(ctx, meta.TeamID)
	teamName := meta.TeamID
	if team != nil {
		teamName = team.Name
	}

	userSub := models.UserSubscription{
		ID:             newDepositID(),
		UserID:         userID,
		SubscriptionID: meta.SubscriptionID,
		TeamID:         meta.TeamID,
		Source:         "team",
		StartDate:      meta.StartDate,
		EndDate:        meta.EndDate,
		IsActive:       true,
		AutoRenew:      false,
	}
	if _, err := h.mongoDB.Collection("user_subscriptions").InsertOne(ctx, userSub); err != nil {
		return models.UserSubscription{}, fmt.Errorf("не удалось выдать командную подписку")
	}
	if notify {
		msg := fmt.Sprintf("Лидер команды «%s» оформил командную подписку. VIP и бонусы активны для всех участников.", teamName)
		if team != nil && team.LeaderID != userID {
			msg = fmt.Sprintf("Вы добавлены в команду «%s» — VIP и бонусы подписки активны.", teamName)
		}
		h.notifyUser(ctx, userID, "team_subscription_activated", "Командная подписка", msg, meta.TeamID)
	}
	return userSub, nil
}

func (h *ClientHandler) userHasActiveTeamSub(ctx context.Context, userID int, teamID string) bool {
	if h.mongoDB == nil || teamID == "" {
		return false
	}
	now := time.Now()

	count, err := h.mongoDB.Collection("user_subscriptions").CountDocuments(ctx, bson.M{
		"user_id":   userID,
		"team_id":   teamID,
		"is_active": true,
		"end_date":  bson.M{"$gt": now},
	})
	if err == nil && count > 0 {
		return true
	}

	meta, ok := h.getActiveTeamSubscriptionMeta(ctx, teamID)
	if !ok {
		return false
	}
	count, err = h.mongoDB.Collection("user_subscriptions").CountDocuments(ctx, bson.M{
		"user_id":         userID,
		"subscription_id": meta.SubscriptionID,
		"is_active":       true,
		"end_date":        bson.M{"$gt": now},
		"$or": []bson.M{
			{"team_id": teamID},
			{"team_id": bson.M{"$in": []interface{}{"", nil}}},
		},
	})
	return err == nil && count > 0
}

func (h *ClientHandler) repairTeamSubscriptionMembers(ctx context.Context, teamID string, meta *teamSubscriptionMeta) {
	team, err := h.findTeamByID(ctx, teamID)
	if err != nil || team == nil {
		return
	}
	for _, memberID := range teamMemberIDs(team) {
		if !h.userHasActiveTeamSub(ctx, memberID, teamID) {
			_, _ = h.grantTeamSubscriptionMember(ctx, memberID, meta, true)
		}
	}
}

// ensureTeamSubscriptionsForTeam — выдать командную подписку всем участникам, если она уже оплачена.
func (h *ClientHandler) ensureTeamSubscriptionsForTeam(ctx context.Context, teamID string) {
	if h.mongoDB == nil || teamID == "" {
		return
	}
	meta, ok := h.getActiveTeamSubscriptionMeta(ctx, teamID)
	if !ok {
		return
	}
	team, err := h.findTeamByID(ctx, teamID)
	if err != nil || team == nil {
		return
	}
	for _, memberID := range teamMemberIDs(team) {
		if !h.userHasActiveTeamSub(ctx, memberID, teamID) {
			_, _ = h.grantTeamSubscriptionMember(ctx, memberID, meta, false)
		}
	}
}

// ensureUserTeamSubscriptions — выдать командную подписку участникам, если у команды она уже оплачена.
func (h *ClientHandler) ensureUserTeamSubscriptions(ctx context.Context, userID int) {
	if h.mongoDB == nil {
		return
	}
	cursor, err := h.mongoDB.Collection("teams").Find(ctx, bson.M{
		"$or": []bson.M{
			{"member_ids": userID},
			{"leader_id": userID},
		},
	})
	if err != nil {
		return
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var team models.TeamMongo
		if err := cursor.Decode(&team); err != nil {
			continue
		}
		meta, ok := h.getActiveTeamSubscriptionMeta(ctx, team.ID)
		if !ok {
			continue
		}
		if !h.userHasActiveTeamSub(ctx, userID, team.ID) {
			_, _ = h.grantTeamSubscriptionMember(ctx, userID, meta, true)
		}
	}
}
