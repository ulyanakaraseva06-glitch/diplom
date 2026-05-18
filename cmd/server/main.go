package main

import (
    "context"
    "log"
    "net/http"

    "esports-manager/internal/config"
    "esports-manager/internal/db"
    "esports-manager/internal/handlers"
    "esports-manager/internal/middleware"
    "esports-manager/internal/mongo"
    "esports-manager/internal/repository"
    "esports-manager/internal/services"

    "github.com/gorilla/mux"
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

    // Подключение к MongoDB
    mongoClient, err := mongo.NewMongoClient(cfg.MongoURI, cfg.MongoDBName)
    if err != nil {
        log.Fatalf("Failed to connect to MongoDB: %v", err)
    }
    defer mongoClient.Close()

    // Синхронизация данных из PostgreSQL в MongoDB
    syncService := services.NewSyncService(userRepo, tournamentRepo, mongoClient.Database)
    if err := syncService.SyncAll(context.Background()); err != nil {
        log.Printf("Warning: sync failed: %v", err)
    }

    // Инициализация подписок
    subService := services.NewSubscriptionService(mongoClient.Database)
    if err := subService.InitSubscriptions(context.Background()); err != nil {
    log.Printf("Warning: subscription init failed: %v", err)
    }


    // Инициализация хендлеров
    authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret)
    tournamentHandler := handlers.NewTournamentHandler(tournamentRepo, userRepo, registrationRepo, bracketRepo)
    registrationHandler := handlers.NewRegistrationHandler(registrationRepo, tournamentRepo, userRepo)
    banHandler := handlers.NewBanHandler(banRepo, userRepo)
    supportHandler := handlers.NewSupportHandler(supportRepo, userRepo, cfg.JWTSecret)
    userHandler := handlers.NewUserHandler(userRepo)
    clientHandler := handlers.NewClientHandler(mongoClient.Database)
    uploadHandler := handlers.NewUploadHandler()

    // Создание роутера
    r := mux.NewRouter()

    // Добавляем CORS middleware для всех маршрутов
    r.Use(middleware.CORS)

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

    // Статические файлы для баннеров
    r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

    // Защищенные маршруты (требуют авторизации)
    api := r.PathPrefix("/api").Subrouter()
    api.Use(middleware.AuthMiddleware([]byte(cfg.JWTSecret)))

    // Для баннера
    api.HandleFunc("/upload/banner", uploadHandler.UploadBanner).Methods("POST", "OPTIONS")

    // Маршруты для клиентского модуля (друзья)
    api.HandleFunc("/client/friends", clientHandler.GetFriends).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/friends/add", clientHandler.AddFriend).Methods("POST", "OPTIONS")

    // Маршруты для клиентского модуля (требуют авторизации)
    api.HandleFunc("/client/register", clientHandler.RegisterForTournament).Methods("POST", "OPTIONS")

    // Клиентские маршруты для профиля
    api.HandleFunc("/client/profile", clientHandler.GetProfile).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/profile", clientHandler.UpdateProfile).Methods("PUT", "OPTIONS")
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

        // Маршруты для темы
    api.HandleFunc("/client/theme", clientHandler.GetUserTheme).Methods("GET", "OPTIONS")
    api.HandleFunc("/client/theme", clientHandler.UpdateUserTheme).Methods("PUT", "OPTIONS")

    // Разрешить и менеджерам, и организаторам
    admin := api.PathPrefix("/admin").Subrouter()
    admin.Use(middleware.RequireRole("manager", "organizer"))  // ← измените здесь
    admin.HandleFunc("/tournaments/{id:[0-9]+}", tournamentHandler.UpdateTournament).Methods("PUT", "OPTIONS")
    admin.HandleFunc("/tournaments/{id:[0-9]+}", tournamentHandler.DeleteTournament).Methods("DELETE", "OPTIONS")

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