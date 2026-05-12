package models

type UserMongo struct {
    ID           int      `json:"id" bson:"id"`
    Email        string   `json:"email" bson:"email"`
    PasswordHash string   `json:"password_hash" bson:"password_hash"`
    Game         []string `json:"game" bson:"game"`
    Rank         []string `json:"rank" bson:"rank"`
    Achievements []string `json:"achievements" bson:"achievements"`
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