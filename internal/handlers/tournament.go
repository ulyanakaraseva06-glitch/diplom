package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "time"

    "esports-manager/internal/middleware"
    "esports-manager/internal/models"
    "esports-manager/internal/repository"

    "github.com/gorilla/mux"
)

type TournamentHandler struct {
    tournamentRepo   *repository.TournamentRepository
    userRepo         *repository.UserRepository
    registrationRepo *repository.RegistrationRepository  // добавь эту строку
}

func NewTournamentHandler(
    tournamentRepo *repository.TournamentRepository,
    userRepo *repository.UserRepository,
    registrationRepo *repository.RegistrationRepository,  // добавь параметр
) *TournamentHandler {
    return &TournamentHandler{
        tournamentRepo:   tournamentRepo,
        userRepo:         userRepo,
        registrationRepo: registrationRepo,  // добавь инициализацию
    }
}

// CreateTournament - создание турнира (доступно организаторам и менеджерам)
func (h *TournamentHandler) CreateTournament(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    role, _ := middleware.GetUserRole(r.Context())

    var req models.TournamentCreate
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Проверка обязательных полей
    if req.Title == "" || req.Game == "" {
        http.Error(w, "Title and game are required", http.StatusBadRequest)
        return
    }

    if req.StartDate.IsZero() || req.RegistrationDeadline.IsZero() {
        http.Error(w, "Start date and registration deadline are required", http.StatusBadRequest)
        return
    }

    // Проверка, что дата регистрации раньше даты начала
    if req.RegistrationDeadline.After(req.StartDate) {
        http.Error(w, "Registration deadline must be before start date", http.StatusBadRequest)
        return
    }

    tournament, err := h.tournamentRepo.Create(r.Context(), &req, userID)
    if err != nil {
        http.Error(w, "Failed to create tournament: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Если пользователь менеджер, автоматически подтверждаем турнир
    if role == "manager" {
        err = h.tournamentRepo.Approve(r.Context(), tournament.ID, userID)
        if err != nil {
            http.Error(w, "Failed to approve tournament: "+err.Error(), http.StatusInternalServerError)
            return
        }
        tournament.Status = models.TournamentStatusApproved
        tournament.ApprovedBy = &userID
        now := time.Now()
        tournament.ApprovedAt = &now
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(tournament)
}

// GetTournament - получение турнира по ID
func (h *TournamentHandler) GetTournament(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
        return
    }

    tournament, err := h.tournamentRepo.FindByID(r.Context(), id)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if tournament == nil {
        http.Error(w, "Tournament not found", http.StatusNotFound)
        return
    }

    // Получаем информацию об организаторе
    organizer, err := h.userRepo.FindByID(r.Context(), tournament.OrganizerID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // Получаем количество зарегистрированных команд
    // Временно ставим 0, позже добавим подсчет
    registeredTeams := 0

    response := struct {
        models.Tournament
        Organizer       *models.UserResponse `json:"organizer,omitempty"`
        RegisteredTeams int                  `json:"registered_teams"`
    }{
        Tournament:      *tournament,
        Organizer:       organizer.ToResponse(),
        RegisteredTeams: registeredTeams,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// ListTournaments - список турниров с фильтрацией
func (h *TournamentHandler) ListTournaments(w http.ResponseWriter, r *http.Request) {
    // Получаем параметры фильтрации из query
    game := r.URL.Query().Get("game")
    status := r.URL.Query().Get("status")
    limit := 20
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

    tournamentStatus := models.TournamentStatus(status)
    if status == "" {
        tournamentStatus = ""
    }

    tournaments, err := h.tournamentRepo.List(r.Context(), game, tournamentStatus, limit, offset)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // Формируем ответ с дополнительной информацией
    var response []struct {
        models.Tournament
        Organizer       *models.UserResponse `json:"organizer,omitempty"`
        RegisteredTeams int                  `json:"registered_teams"`
    }

    for _, t := range tournaments {
        organizer, err := h.userRepo.FindByID(r.Context(), t.OrganizerID)
        if err != nil {
            continue
        }

        response = append(response, struct {
            models.Tournament
            Organizer       *models.UserResponse `json:"organizer,omitempty"`
            RegisteredTeams int                  `json:"registered_teams"`
        }{
            Tournament:      *t,
            Organizer:       organizer.ToResponse(),
            RegisteredTeams: 0,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// UpdateTournament - обновление турнира (только для менеджеров)
func (h *TournamentHandler) UpdateTournament(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
        return
    }

    var req models.TournamentUpdate
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    tournament, err := h.tournamentRepo.Update(r.Context(), id, &req)
    if err != nil {
        http.Error(w, "Failed to update tournament: "+err.Error(), http.StatusInternalServerError)
        return
    }
    if tournament == nil {
        http.Error(w, "Tournament not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(tournament)
}

// DeleteTournament - удаление турнира (только для менеджеров)
func (h *TournamentHandler) DeleteTournament(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
        return
    }

    err = h.tournamentRepo.Delete(r.Context(), id)
    if err != nil {
        http.Error(w, "Failed to delete tournament: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

// ApproveTournament - подтверждение турнира (только для менеджеров)
func (h *TournamentHandler) ApproveTournament(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
        return
    }

    managerID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    err = h.tournamentRepo.Approve(r.Context(), id, managerID)
    if err != nil {
        http.Error(w, "Failed to approve tournament: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"message": "Tournament approved successfully"}`))
}

// GetTournamentWithRegistrations - получение турнира со списком участников
func (h *TournamentHandler) GetTournamentWithRegistrations(w http.ResponseWriter, r *http.Request) {
    // CORS headers
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    
    if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusOK)
        return
    }
    
    // остальной код...

    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
        return
    }

    // Получаем турнир
    tournament, err := h.tournamentRepo.FindByID(r.Context(), id)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    if tournament == nil {
        http.Error(w, "Tournament not found", http.StatusNotFound)
        return
    }

    // Получаем организатора
    organizer, err := h.userRepo.FindByID(r.Context(), tournament.OrganizerID)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // Получаем подтверждённые заявки
    registrations, err := h.registrationRepo.GetApprovedByTournament(r.Context(), id)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // Формируем список участников
    var participants []map[string]interface{}
    for _, reg := range registrations {
        user, _ := h.userRepo.FindByID(r.Context(), reg.UserID)
        participants = append(participants, map[string]interface{}{
            "id":         reg.ID,
            "user_id":    reg.UserID,
            "username":   user.Username,
            "team_name":  reg.TeamName,
            "registered_at": reg.RegisteredAt,
        })
    }

    response := map[string]interface{}{
        "id":                   tournament.ID,
        "title":                tournament.Title,
        "game":                 tournament.Game,
        "description":          tournament.Description,
        "start_date":           tournament.StartDate,
        "registration_deadline": tournament.RegistrationDeadline,
        "entry_fee":            tournament.EntryFee,
        "prize_pool":           tournament.PrizePool,
        "max_teams":            tournament.MaxTeams,
        "status":               tournament.Status,
        "organizer":            organizer.ToResponse(),
        "participants":         participants,
        "created_at":           tournament.CreatedAt,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}