package services

import (
    "context"
    "log"
    "math"

    "esports-manager/internal/models"
    "esports-manager/internal/repository"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
)

type SyncService struct {
    userRepo         *repository.UserRepository
    tournamentRepo   *repository.TournamentRepository
    mongoUsers       *mongo.Collection
    mongoTournaments *mongo.Collection
}

func NewSyncService(
    userRepo *repository.UserRepository,
    tournamentRepo *repository.TournamentRepository,
    mongoDB *mongo.Database,
) *SyncService {
    return &SyncService{
        userRepo:         userRepo,
        tournamentRepo:   tournamentRepo,
        mongoUsers:       mongoDB.Collection("users"),
        mongoTournaments: mongoDB.Collection("tournaments"),
    }
}

func (s *SyncService) SyncAll(ctx context.Context) error {
    log.Println("Starting sync from PostgreSQL to MongoDB...")

    // Синхронизация пользователей
    users, err := s.userRepo.List(ctx, 1000, 0)
    if err != nil {
        return err
    }

    for _, u := range users {
        var existing models.UserMongo
        err := s.mongoUsers.FindOne(ctx, bson.M{"id": u.ID}).Decode(&existing)
        if err == mongo.ErrNoDocuments {
            // Нет в MongoDB — добавляем
            mongoUser := models.UserMongo{
                ID:           u.ID,
                Email:        u.Email,
                PasswordHash: u.PasswordHash,
                Game:         []string{},
                Rank:         []string{},
                Achievements: []string{},
            }
            _, err = s.mongoUsers.InsertOne(ctx, mongoUser)
            if err != nil {
                log.Printf("Failed to insert user %d: %v", u.ID, err)
            }
        }
    }

    // Синхронизация турниров
    tournaments, err := s.tournamentRepo.List(ctx, "", "", 1000, 0)
    if err != nil {
        return err
    }

    for _, t := range tournaments {
        var existing models.TournamentMongo
        err := s.mongoTournaments.FindOne(ctx, bson.M{"id": t.ID}).Decode(&existing)
        if err == mongo.ErrNoDocuments {
            // Вычисляем количество раундов
            rounds := int(math.Ceil(math.Log2(float64(t.MaxTeams))))
            
            mongoTournament := models.TournamentMongo{
                ID:           t.ID,
                Title:        t.Title,
                Game:         t.Game,
                MaxTeams:     t.MaxTeams,
                NumberRounds: rounds,
                WinnerTeam:   "",
                Info:         "",
            }
            _, err = s.mongoTournaments.InsertOne(ctx, mongoTournament)
            if err != nil {
                log.Printf("Failed to insert tournament %d: %v", t.ID, err)
            }
        }
    }

    log.Println("Sync completed")
    return nil
}