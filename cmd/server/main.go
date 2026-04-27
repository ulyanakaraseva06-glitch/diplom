package main

import (
    "log"
    "net/http"

    "esports-manager/internal/config"
    "esports-manager/internal/db"
    "esports-manager/internal/handlers"
    "esports-manager/internal/middleware"
    "esports-manager/internal/repository"

    "github.com/gorilla/mux"
)

func main() {
    // Загрузка конфигурации
    cfg := config.Load()

    // Подключение к базе данных
    database, err := db.NewPostgresDB(cfg)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    defer database.Close()

    // Инициализация репозиториев
    userRepo := repository.NewUserRepository(database)
    tournamentRepo := repository.NewTournamentRepository(database)
    registrationRepo := repository.NewRegistrationRepository(database)
    banRepo := repository.NewBanRepository(database)
    supportRepo := repository.NewSupportRepository(database)

    // Инициализация хендлеров
    authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret)
    tournamentHandler := handlers.NewTournamentHandler(tournamentRepo, userRepo, registrationRepo)
    registrationHandler := handlers.NewRegistrationHandler(registrationRepo, tournamentRepo, userRepo)
    banHandler := handlers.NewBanHandler(banRepo, userRepo)
    userHandler := handlers.NewUserHandler(userRepo)
    supportHandler := handlers.NewSupportHandler(supportRepo, userRepo, cfg.JWTSecret)

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

    // Защищенные маршруты (требуют авторизации)
    api := r.PathPrefix("/api").Subrouter()
    api.Use(middleware.AuthMiddleware([]byte(cfg.JWTSecret)))
    api.HandleFunc("/admin/users", userHandler.ListUsers).Methods("GET", "OPTIONS")
    api.HandleFunc("/admin/users/{id:[0-9]+}", userHandler.GetUserByID).Methods("GET", "OPTIONS")

    // Маршруты для турниров
    api.HandleFunc("/tournaments", tournamentHandler.ListTournaments).Methods("GET", "OPTIONS")
    api.HandleFunc("/tournaments", tournamentHandler.CreateTournament).Methods("POST", "OPTIONS")
    api.HandleFunc("/tournaments/{id:[0-9]+}", tournamentHandler.GetTournament).Methods("GET", "OPTIONS")

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
    api.HandleFunc("/tournaments/{id:[0-9]+}/details", tournamentHandler.GetTournamentWithRegistrations).Methods("GET", "OPTIONS")

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