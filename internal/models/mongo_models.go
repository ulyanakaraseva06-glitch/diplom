package models

type UserMongo struct {
    ID           int      `bson:"id"`
    Email        string   `bson:"email"`
    PasswordHash string   `bson:"password_hash"`
    Game         string   `bson:"game"`
    Rank         string   `bson:"rank"`
    Achievements []string `bson:"achievements"`
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