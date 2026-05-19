package main

import (
	"context"
	"log"
	"net/http"
	"path/filepath"

	"esports-manager/internal/config"
	"esports-manager/internal/db"
	"esports-manager/internal/handlers"
	"esports-manager/internal/middleware"
	"esports-manager/internal/mongo"
	"esports-manager/internal/repository"
	"esports-manager/internal/services"
	"esports-manager/internal/utils"

	"github.com/gorilla/mux"
	mongodriver "go.mongodb.org/mongo-driver/mongo"
)

func main() {
    // Загрузка конфигурации
    cfg := config.Load()

    // Подключение к PostgreSQL
    database, err := db.NewPostgresDB(cfg)
    if err != nil {
        log.Fatalf("Failed to connect to PostgreSQL: %v", err)
    }
    defer database.Close()

    // Инициализация репозиториев PostgreSQL
    userRepo := repository.NewUserRepository(database)
    tournamentRepo := repository.NewTournamentRepository(database)
    registrationRepo := repository.NewRegistrationRepository(database)
    banRepo := repository.NewBanRepository(database)
    supportRepo := repository.NewSupportRepository(database)
    bracketRepo := repository.NewBracketRepository(database)

    // MongoDB — опционально (турниры на клиенте читаются из PostgreSQL)
    var syncService *services.SyncService
    var mongoClient *mongo.MongoClient
    mc, mongoErr := mongo.NewMongoClient(cfg.MongoURI, cfg.MongoDBName)
    if mongoErr != nil {
        log.Printf("Warning: MongoDB unavailable: %v", mongoErr)
    } else {
        mongoClient = mc
        defer mongoClient.Close()
        syncService = services.NewSyncService(userRepo, tournamentRepo, mongoClient.Database)
        if err := syncService.SyncAll(context.Background()); err != nil {
            log.Printf("Warning: sync failed: %v", err)
        }
        subService := services.NewSubscriptionService(mongoClient.Database)
        if err := subService.InitSubscriptions(context.Background()); err != nil {
            log.Printf("Warning: subscription init failed: %v", err)
        }
    }

    var mongoDatabase *mongodriver.Database
    if mongoClient != nil {
        mongoDatabase = mongoClient.Database
    }

    // Инициализация хендлеров
    authHandler := handlers.NewAuthHandler(userRepo, syncService, mongoDatabase, cfg.JWTSecret)
    tournamentHandler := handlers.NewTournamentHandler(tournamentRepo, userRepo, registrationRepo, bracketRepo)
    registrationHandler := handlers.NewRegistrationHandler(registrationRepo, tournamentRepo, userRepo)
    banHandler := handlers.NewBanHandler(banRepo, userRepo)
    supportHandler := handlers.NewSupportHandler(supportRepo, userRepo, cfg.JWTSecret)
    userHandler := handlers.NewUserHandler(userRepo)
    clientHandler := handlers.NewClientHandler(mongoDatabase, userRepo, supportRepo, tournamentRepo)
    uploadHandler := handlers.NewUploadHandler()

    // Создание роутера
    r := mux.NewRouter()

    // Добавляем CORS middleware для всех маршрутов
    r.Use(middleware.CORS)

    uploadsPath := filepath.Join(utils.GetProjectRoot(), "uploads")
    r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadsPath))))

    // Публичные маршруты (не требуют авторизации)
    r.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
    r.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")
    r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    }).Methods("GET", "OPTIONS")

    // WebSocket (не требует авторизации)
    r.HandleFunc("/ws/support", supportHandler.WebSocket).Methods("GET", "OPTIONS")
    // Клиентские маршруты (публичные)
    r.HandleFunc("/api/client/tournaments", clientHandler.GetTournaments).Methods("GET", "OPTIONS")
    r.HandleFunc("/api/client/news", handlers.GetCybersportNews).Methods("GET", "OPTIONS")
    // Защищенные маршруты (требуют авторизации)
    api := r.PathPrefix("/api").Subrouter()
    api.Use(middleware.AuthMiddleware([]byte(cfg.JWTSecret)))

    // Друзья
    api.HandleFunc("/client/friends", clientHandler.GetFriends).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/friends/list", clientHandler.GetFriendsDetailed).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/friends/requests", clientHandler.GetFriendRequests).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/friends/add", clientHandler.AddFriend).Methods("POST", "OPTIONS")
    api.HandleFunc("/client/friends/request", clientHandler.SendFriendRequest).Methods("POST", "OPTIONS")
    api.HandleFunc("/client/friends/respond", clientHandler.RespondFriendRequest).Methods("POST", "OPTIONS")
    api.HandleFunc("/client/users", clientHandler.ListPlayers).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/notifications", clientHandler.GetNotifications).Methods("GET", "OPTIONS")

    // Мессенджер
    api.HandleFunc("/client/chats", clientHandler.ListChats).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/chats/{peer_id:[0-9]+}/messages", clientHandler.GetChatMessages).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/chats/{peer_id:[0-9]+}/messages", clientHandler.SendChatMessage).Methods("POST", "OPTIONS")

    // Кошелёк
    api.HandleFunc("/client/wallet", clientHandler.GetWallet).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/wallet/deposit", clientHandler.DepositWallet).Methods("POST", "OPTIONS")
    api.HandleFunc("/subscriptions/pay", clientHandler.SubscribeWithBalance).Methods("POST", "OPTIONS")

    // Загрузка файлов
    api.HandleFunc("/client/upload", uploadHandler.UploadImage).Methods("POST", "OPTIONS")

    // Маршруты для клиентского модуля (требуют авторизации)
    api.HandleFunc("/client/register", clientHandler.RegisterForTournament).Methods("POST", "OPTIONS")

    // Клиентские маршруты для профиля
    api.HandleFunc("/client/profile", clientHandler.GetProfile).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/profile/game-cards", clientHandler.UpdateProfileGameCards).Methods("PUT", "OPTIONS")
    api.HandleFunc("/client/profile/avatar", clientHandler.UpdateProfileAvatar).Methods("PUT", "OPTIONS")
    api.HandleFunc("/auth/me", authHandler.GetMe).Methods("GET", "OPTIONS")
    api.HandleFunc("/auth/update", authHandler.UpdateUser).Methods("PUT", "OPTIONS")

    // Маршруты для подписок
    api.HandleFunc("/subscriptions", clientHandler.GetSubscriptions).Methods("GET", "OPTIONS")
    api.HandleFunc("/subscriptions/my", clientHandler.GetUserSubscription).Methods("GET", "OPTIONS")
    api.HandleFunc("/subscriptions/subscribe", clientHandler.Subscribe).Methods("POST", "OPTIONS")
    api.HandleFunc("/subscriptions/cancel", clientHandler.CancelSubscription).Methods("POST", "OPTIONS")

    // Маршруты для административного модуля
    api.HandleFunc("/admin/users", userHandler.ListUsers).Methods("GET", "OPTIONS")
    api.HandleFunc("/admin/users/{id:[0-9]+}", userHandler.GetUserByID).Methods("GET", "OPTIONS")

    // Маршруты для турниров
    api.HandleFunc("/tournaments", tournamentHandler.ListTournaments).Methods("GET", "OPTIONS")
    api.HandleFunc("/tournaments", tournamentHandler.CreateTournament).Methods("POST", "OPTIONS")
    api.HandleFunc("/tournaments/{id:[0-9]+}", tournamentHandler.GetTournament).Methods("GET", "OPTIONS")
    api.HandleFunc("/tournaments/{id:[0-9]+}/details", tournamentHandler.GetTournamentWithRegistrations).Methods("GET", "OPTIONS")
    api.HandleFunc("/tournaments/{id:[0-9]+}/bracket", tournamentHandler.SaveBracket).Methods("POST", "OPTIONS")
    api.HandleFunc("/tournaments/{id:[0-9]+}/bracket", tournamentHandler.GetBracket).Methods("GET", "OPTIONS")

    // Маршруты для заявок
    api.HandleFunc("/tournaments/{tournament_id:[0-9]+}/register", registrationHandler.RegisterForTournament).Methods("POST", "OPTIONS")
    api.HandleFunc("/tournaments/{tournament_id:[0-9]+}/registrations", registrationHandler.GetRegistrationsByTournament).Methods("GET", "OPTIONS")
    api.HandleFunc("/registrations/{id:[0-9]+}/approve", registrationHandler.ApproveRegistration).Methods("POST", "OPTIONS")
    api.HandleFunc("/registrations/{id:[0-9]+}/reject", registrationHandler.RejectRegistration).Methods("POST", "OPTIONS")

    // Маршруты для чата поддержки
    api.HandleFunc("/support/{user_id:[0-9]+}/messages", supportHandler.GetMessages).Methods("GET", "OPTIONS")
    api.HandleFunc("/support/{user_id:[0-9]+}/messages", supportHandler.SendMessage).Methods("POST", "OPTIONS")
    api.HandleFunc("/support/{user_id:[0-9]+}/unread", supportHandler.GetUnreadCount).Methods("GET", "OPTIONS")
    api.HandleFunc("/support/{user_id:[0-9]+}/read", supportHandler.MarkAsRead).Methods("POST", "OPTIONS")

    // Маршруты только для менеджеров
    admin := api.PathPrefix("/admin").Subrouter()
    admin.Use(middleware.RequireManager)
    admin.HandleFunc("/tournaments/{id:[0-9]+}", tournamentHandler.UpdateTournament).Methods("PUT", "OPTIONS")
    admin.HandleFunc("/tournaments/{id:[0-9]+}", tournamentHandler.DeleteTournament).Methods("DELETE", "OPTIONS")
    admin.HandleFunc("/tournaments/{id:[0-9]+}/approve", tournamentHandler.ApproveTournament).Methods("POST", "OPTIONS")

    // Блокировки
    admin.HandleFunc("/bans", banHandler.ListActiveBans).Methods("GET", "OPTIONS")
    admin.HandleFunc("/bans", banHandler.CreateBan).Methods("POST", "OPTIONS")
    admin.HandleFunc("/bans/{user_id:[0-9]+}", banHandler.RemoveBan).Methods("DELETE", "OPTIONS")
    admin.HandleFunc("/bans/{user_id:[0-9]+}", banHandler.GetActiveBan).Methods("GET", "OPTIONS")

    // Запуск сервера
    port := "8080"
    log.Printf("Server starting on port %s", port)

    if err := http.ListenAndServe(":"+port, r); err != nil {
        log.Fatalf("Server failed: %v", err)
    }
}