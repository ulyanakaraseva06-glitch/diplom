package handlers

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strconv"
    "time"
    "log"  

    "esports-manager/internal/middleware"
    "esports-manager/internal/models"
    "esports-manager/internal/repository"

    "github.com/gorilla/mux"
)

type TournamentHandler struct {
    tournamentRepo   *repository.TournamentRepository
    userRepo         *repository.UserRepository
    registrationRepo *repository.RegistrationRepository
    bracketRepo      *repository.BracketRepository
    logRepo          *repository.ManagerLogRepository 
}

func NewTournamentHandler(
    tournamentRepo *repository.TournamentRepository,
    userRepo *repository.UserRepository,
    registrationRepo *repository.RegistrationRepository,
    bracketRepo *repository.BracketRepository,
    logRepo *repository.ManagerLogRepository,  // добавить параметр
) *TournamentHandler {
    return &TournamentHandler{
        tournamentRepo:   tournamentRepo,
        userRepo:         userRepo,
        registrationRepo: registrationRepo,
        bracketRepo:      bracketRepo,
        logRepo:          logRepo,  // добавить
    }
}

// CreateTournament - создание турнира (доступно организаторам и менеджерам)
func (h *TournamentHandler) CreateTournament(w http.ResponseWriter, r *http.Request) {
    fmt.Println("=== CreateTournament START ===")

    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    role, _ := middleware.GetUserRole(r.Context())

    var req models.TournamentCreate
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        fmt.Printf("Decode error: %v\n", err)
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    fmt.Printf("Received tournament: Title=%s, Game=%s, BannerURL=%v\n",
        req.Title, req.Game, req.BannerURL)

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
// DeleteTournament - удаление турнира (только для менеджеров)
// DeleteTournament - удаление турнира (только для менеджеров)
func (h *TournamentHandler) DeleteTournament(w http.ResponseWriter, r *http.Request) {
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

    // Получаем турнир для логирования
    tournament, _ := h.tournamentRepo.FindByID(r.Context(), id)
    tournamentTitle := ""
    if tournament != nil {
        tournamentTitle = tournament.Title
    }

    err = h.tournamentRepo.Delete(r.Context(), id)
    if err != nil {
        http.Error(w, "Failed to delete tournament: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Логируем действие
    if h.logRepo != nil {
        err := h.logRepo.Create(r.Context(), managerID, "DELETE", "tournament", id, tournamentTitle, "")
        if err != nil {
            log.Printf("Failed to create log: %v", err)
        }
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
            "id":            reg.ID,
            "user_id":       reg.UserID,
            "username":      user.Username,
            "team_name":     reg.TeamName,
            "registered_at": reg.RegisteredAt,
        })
    }

    response := map[string]interface{}{
        "id":                    tournament.ID,
        "title":                 tournament.Title,
        "game":                  tournament.Game,
        "description":           tournament.Description,
        "banner_url":            tournament.BannerURL, 
        "start_date":            tournament.StartDate,
        "registration_deadline": tournament.RegistrationDeadline,
        "entry_fee":             tournament.EntryFee,
        "prize_pool":            tournament.PrizePool,
        "max_teams":             tournament.MaxTeams,
        "status":                tournament.Status,
        "organizer":             organizer.ToResponse(),
        "participants":          participants,
        "created_at":            tournament.CreatedAt,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// SaveBracket - сохранение сетки турнира
func (h *TournamentHandler) SaveBracket(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
        return
    }

    var req struct {
        Matches []struct {
            ID          string `json:"id"`
            Team1Id     *int   `json:"team1Id"`
            Team2Id     *int   `json:"team2Id"`
            WinnerId    *int   `json:"winnerId"`
            NextMatchId string `json:"nextMatchId"`
            Round       int    `json:"round"`
            Position    int    `json:"position"`
        } `json:"matches"`
        ChampionId *int `json:"championId"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Конвертируем в формат репозитория
    var matches []repository.BracketMatch
    for _, m := range req.Matches {
        matches = append(matches, repository.BracketMatch{
            MatchID:     m.ID,
            Team1ID:     m.Team1Id,
            Team2ID:     m.Team2Id,
            WinnerID:    m.WinnerId,
            NextMatchID: m.NextMatchId,
            RoundNumber: m.Round,
            Position:    m.Position,
        })
    }

    err = h.bracketRepo.SaveBracket(r.Context(), id, matches, req.ChampionId)
    if err != nil {
        http.Error(w, "Failed to save bracket: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"message": "Bracket saved successfully"})
}

// GetBracket - получение сохранённой сетки турнира
func (h *TournamentHandler) GetBracket(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid tournament ID", http.StatusBadRequest)
        return
    }

    matches, championID, err := h.bracketRepo.LoadBracket(r.Context(), id)
    if err != nil {
        http.Error(w, "Failed to load bracket: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Конвертируем обратно в формат для фронтенда
    var responseMatches []map[string]interface{}
    for _, m := range matches {
        responseMatches = append(responseMatches, map[string]interface{}{
            "id":          m.MatchID,
            "team1Id":     m.Team1ID,
            "team2Id":     m.Team2ID,
            "winnerId":    m.WinnerID,
            "nextMatchId": m.NextMatchID,
            "round":       m.RoundNumber,
            "position":    m.Position,
        })
    }

    response := map[string]interface{}{
        "matches":    responseMatches,
        "championId": championID,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}