package models

import (
	"time"
)

type GameCard struct {
	ID      string `json:"id" bson:"id"`
	Game    string `json:"game" bson:"game"`
	Rank    string `json:"rank" bson:"rank"`
	Comment string `json:"comment" bson:"comment"`
}

type UserMongo struct {
	ID           int        `json:"id" bson:"id"`
	Email        string     `json:"email" bson:"email"`
	PasswordHash string     `json:"-" bson:"password_hash,omitempty"`
	Game         []string   `json:"game,omitempty" bson:"game,omitempty"`
	Rank         []string   `json:"rank,omitempty" bson:"rank,omitempty"`
	Achievements []string   `json:"achievements,omitempty" bson:"achievements,omitempty"`
	GameCards    []GameCard `json:"game_cards" bson:"game_cards"`
	AvatarURL    string     `json:"avatar_url" bson:"avatar_url"`
	Balance      float64    `json:"balance" bson:"balance"`
	Theme        string     `json:"theme" bson:"theme"`
}

type FriendRequestMongo struct {
	ID         string    `json:"id" bson:"id"`
	FromUserID int       `json:"from_user_id" bson:"from_user_id"`
	ToUserID   int       `json:"to_user_id" bson:"to_user_id"`
	Status     string    `json:"status" bson:"status"` // pending, accepted, rejected
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
}

type TeamMongo struct {
	ID         string    `json:"id" bson:"id"`
	ChatPeerID int       `json:"chat_peer_id" bson:"chat_peer_id"`
	Name       string    `json:"name" bson:"name"`
	AvatarURL  string    `json:"avatar_url" bson:"avatar_url"`
	LeaderID   int       `json:"leader_id" bson:"leader_id"`
	MemberIDs  []int     `json:"member_ids" bson:"member_ids"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
}

type TeamMessageMongo struct {
	ID        string    `json:"id" bson:"id"`
	TeamID    string    `json:"team_id" bson:"team_id"`
	UserID    int       `json:"user_id" bson:"user_id"`
	Text      string    `json:"text" bson:"text"`
	ImageURL  string    `json:"image_url" bson:"image_url"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}

type DirectMessageMongo struct {
	ID         string    `json:"id" bson:"id"`
	FromUserID int       `json:"from_user_id" bson:"from_user_id"`
	ToUserID   int       `json:"to_user_id" bson:"to_user_id"`
	Text       string    `json:"text" bson:"text"`
	ImageURL   string    `json:"image_url,omitempty" bson:"image_url,omitempty"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
}

type NotificationMongo struct {
	ID        string    `json:"id" bson:"id"`
	UserID    int       `json:"user_id" bson:"user_id"`
	Type      string    `json:"type" bson:"type"`
	Title     string    `json:"title" bson:"title"`
	Body      string    `json:"body" bson:"body"`
	RefID     string    `json:"ref_id" bson:"ref_id"`
	IsRead    bool      `json:"is_read" bson:"is_read"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}

type TournamentMongo struct {
	ID           int     `bson:"id"`
	Title        string  `bson:"title"`
	Game         string  `bson:"game"`
	MaxTeams     int     `bson:"max_teams"`
	NumberRounds int     `bson:"number_rounds"`
	WinnerTeam   string  `bson:"winner_team"`
	Info         string  `bson:"info_tournament"`
	IsVIP        bool    `bson:"is_vip"`
	BannerURL    *string `bson:"banner_url"`
}

type RoundTournamentMongo struct {
	ID         int    `bson:"id"`
	Round      int    `bson:"round"`
	Score      string `bson:"score"`
	UsersScore string `bson:"users_score"`
	MVP        string `bson:"MVP"`
}

type Subscription struct {
	ID         string   `json:"id" bson:"id"`
	Name       string   `json:"name" bson:"name"`
	Price      int      `json:"price" bson:"price"`
	Benefits   []string `json:"benefits" bson:"benefits"`
	TargetType string   `json:"target_type" bson:"target_type"`
}

type UserSubscription struct {
	ID             string    `json:"id" bson:"id"`
	UserID         int       `json:"user_id" bson:"user_id"`
	SubscriptionID string    `json:"subscription_id" bson:"subscription_id"`
	TeamID         string    `json:"team_id,omitempty" bson:"team_id,omitempty"`
	Source         string    `json:"source" bson:"source"` // self | team
	StartDate      time.Time `json:"start_date" bson:"start_date"`
	EndDate        time.Time `json:"end_date" bson:"end_date"`
	IsActive       bool      `json:"is_active" bson:"is_active"`
	AutoRenew      bool      `json:"auto_renew" bson:"auto_renew"`
}
