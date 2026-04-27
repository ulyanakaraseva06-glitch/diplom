package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"

    "esports-manager/internal/middleware"
    "esports-manager/internal/models"
    "esports-manager/internal/repository"

    "github.com/gorilla/mux"
)

type RegistrationHandler struct {
    registrationRepo *repository.RegistrationRepository
    tournamentRepo   *repository.TournamentRepository
    userRepo         *repository.UserRepository
}

func NewRegistrationHandler(
    registrationRepo *repository.RegistrationRepository,
    tournamentRepo *repository.TournamentRepository,
    userRepo *repository.UserRepository,
) *RegistrationHandler {
    return &RegistrationHandler{
        registrationRepo: registrationRepo,
        tournamentRepo:   tournamentRepo,
        userRepo:         userRepo,
    }
}

// RegisterForTournament - регистрация на турнир (для игроков)
func (h *RegistrationHandler) RegisterForTournament(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req models.RegistrationRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    if req.TournamentID == 0 || req.TeamName == "" {
        http.Error(w, "Tournament ID and team name are required", http.StatusBadRequest)
        return
    }

    // Проверяем, существует ли турнир
    tournament, err := h.tournamentRepo.FindByID(r.Context(), req.TournamentID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if tournament == nil {
        http.Error(w, "Tournament not found", http.StatusNotFound)
        return
    }

    // Проверяем, что турнир одобрен
    if tournament.Status != models.TournamentStatusApproved {
        http.Error(w, "Tournament is not open for registration", http.StatusBadRequest)
        return
    }

    // Создаем заявку
    registration, err := h.registrationRepo.Create(r.Context(), req.TournamentID, userID, req.TeamName)
    if err != nil {
        http.Error(w, "Failed to register: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(registration)
}

// GetRegistrationsByTournament - список заявок на турнир (для организатора и менеджера)
func (h *RegistrationHandler) GetRegistrationsByTournament(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    tournamentID, err := strconv.Atoi(vars["tournament_id"])
    if err != nil {
        http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
        return
    }

    userID, _ := middleware.GetUserID(r.Context())
    role, _ := middleware.GetUserRole(r.Context())

    // Проверяем турнир
    tournament, err := h.tournamentRepo.FindByID(r.Context(), tournamentID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if tournament == nil {
        http.Error(w, "Tournament not found", http.StatusNotFound)
        return
    }

    // Только организатор этого турнира или менеджер могут видеть заявки
    if role != "manager" && tournament.OrganizerID != userID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    // Параметры пагинации
    limit := 50
    offset := 0
    if l := r.URL.Query().Get("limit"); l != "" {
        if val, err := strconv.Atoi(l); err == nil && val > 0 {
            limit = val
        }
    }
    if o := r.URL.Query().Get("offset"); o != "" {
        if val, err := strconv.Atoi(o); err == nil && val >= 0 {
            offset = val
        }
    }

    status := r.URL.Query().Get("status")
    registrationStatus := models.RegistrationStatus(status)

    registrations, err := h.registrationRepo.ListByTournament(r.Context(), tournamentID, registrationStatus, limit, offset)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // Формируем ответ с информацией о пользователях
    var response []struct {
        ID             int                       `json:"id"`
        TournamentID   int                       `json:"tournament_id"`
        UserID         int                       `json:"user_id"`
        Username       string                    `json:"username"`
        Email          string                    `json:"email"`
        TeamName       string                    `json:"team_name"`
        Status         models.RegistrationStatus `json:"status"`
        PaymentStatus  models.PaymentStatus      `json:"payment_status"`
        RegisteredAt   string                    `json:"registered_at"`
    }

    for _, reg := range registrations {
        user, err := h.userRepo.FindByID(r.Context(), reg.UserID)
        if err != nil {
            continue
        }

        response = append(response, struct {
            ID             int                       `json:"id"`
            TournamentID   int                       `json:"tournament_id"`
            UserID         int                       `json:"user_id"`
            Username       string                    `json:"username"`
            Email          string                    `json:"email"`
            TeamName       string                    `json:"team_name"`
            Status         models.RegistrationStatus `json:"status"`
            PaymentStatus  models.PaymentStatus      `json:"payment_status"`
            RegisteredAt   string                    `json:"registered_at"`
        }{
            ID:            reg.ID,
            TournamentID:  reg.TournamentID,
            UserID:        reg.UserID,
            Username:      user.Username,
            Email:         user.Email,
            TeamName:      reg.TeamName,
            Status:        reg.Status,
            PaymentStatus: reg.PaymentStatus,
            RegisteredAt:  reg.RegisteredAt.String(),
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// ApproveRegistration - подтверждение заявки (для организатора или менеджера)
func (h *RegistrationHandler) ApproveRegistration(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    registrationID, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid registration ID", http.StatusBadRequest)
        return
    }

    managerID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    role, _ := middleware.GetUserRole(r.Context())

    // Получаем заявку
    registration, err := h.registrationRepo.FindByID(r.Context(), registrationID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if registration == nil {
        http.Error(w, "Registration not found", http.StatusNotFound)
        return
    }

    // Проверяем турнир
    tournament, err := h.tournamentRepo.FindByID(r.Context(), registration.TournamentID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // Только организатор этого турнира или менеджер могут подтверждать заявки
    if role != "manager" && tournament.OrganizerID != managerID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    err = h.registrationRepo.Approve(r.Context(), registrationID, managerID)
    if err != nil {
        http.Error(w, "Failed to approve registration: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"message": "Registration approved successfully"}`))
}

// RejectRegistration - отклонение заявки (для организатора или менеджера)
func (h *RegistrationHandler) RejectRegistration(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    registrationID, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid registration ID", http.StatusBadRequest)
        return
    }

    managerID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    role, _ := middleware.GetUserRole(r.Context())

    // Получаем заявку
    registration, err := h.registrationRepo.FindByID(r.Context(), registrationID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if registration == nil {
        http.Error(w, "Registration not found", http.StatusNotFound)
        return
    }

    // Проверяем турнир
    tournament, err := h.tournamentRepo.FindByID(r.Context(), registration.TournamentID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // Только организатор этого турнира или менеджер могут отклонять заявки
    if role != "manager" && tournament.OrganizerID != managerID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    err = h.registrationRepo.Reject(r.Context(), registrationID, managerID)
    if err != nil {
        http.Error(w, "Failed to reject registration: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"message": "Registration rejected successfully"}`))
}