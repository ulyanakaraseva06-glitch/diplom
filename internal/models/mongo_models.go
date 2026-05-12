package models

import (
    "time"
)


type UserMongo struct {
    ID           int      `json:"id" bson:"id"`
    Email        string   `json:"email" bson:"email"`
    PasswordHash string   `json:"password_hash" bson:"password_hash"`
    Game         []string `json:"game" bson:"game"`
    Rank         []string `json:"rank" bson:"rank"`
    Achievements []string `json:"achievements" bson:"achievements"`
    Theme        string   `json:"theme" bson:"theme"` // light, dark, cyber
}

type TournamentMongo struct {
    ID           int    `bson:"id"`
    Title        string `bson:"title"`
    Game         string `bson:"game"`
    MaxTeams     int    `bson:"max_teams"`
    NumberRounds int    `bson:"number_rounds"`
    WinnerTeam   string `bson:"winner_team"`
    Info         string `bson:"info_tournament"`
}

type RoundTournamentMongo struct {
    ID          int    `bson:"id"`
    Round       int    `bson:"round"`
    Score       string `bson:"score"`
    UsersScore  string `bson:"users_score"`
    MVP         string `bson:"MVP"`
}
// Subscription - модель подписки
type Subscription struct {
    ID          string   `json:"id" bson:"id"`
    Name        string   `json:"name" bson:"name"`
    Price       int      `json:"price" bson:"price"`
    Benefits    []string `json:"benefits" bson:"benefits"`
    TargetType  string   `json:"target_type" bson:"target_type"` // user, team, organizer
}

// UserSubscription - подписка пользователя
type UserSubscription struct {
    ID             string    `json:"id" bson:"id"`
    UserID         int       `json:"user_id" bson:"user_id"`
    SubscriptionID string    `json:"subscription_id" bson:"subscription_id"`
    StartDate      time.Time `json:"start_date" bson:"start_date"`
    EndDate        time.Time `json:"end_date" bson:"end_date"`
    IsActive       bool      `json:"is_active" bson:"is_active"`
    AutoRenew      bool      `json:"auto_renew" bson:"auto_renew"`
}