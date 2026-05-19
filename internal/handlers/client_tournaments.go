package handlers

import (
	"context"
	"encoding/json"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"esports-manager/internal/middleware"
	"esports-manager/internal/models"
	"esports-manager/internal/repository"

	"github.com/gorilla/mux"
)

type clientTournamentView struct {
	ID                   int     `json:"id"`
	Title                string  `json:"title"`
	Game                 string  `json:"game"`
	MaxTeams             int     `json:"max_teams"`
	NumberRounds         int     `json:"number_rounds"`
	WinnerTeam           string  `json:"winner_team"`
	InfoTournament       string  `json:"info_tournament"`
	Description          string  `json:"description"`
	Status               string  `json:"status"`
	StartDate            string  `json:"start_date"`
	RegistrationDeadline string  `json:"registration_deadline"`
	EntryFee             float64 `json:"entry_fee"`
	PrizePool            float64 `json:"prize_pool"`
	BannerURL            string  `json:"banner_url"`
	IsVIP                bool    `json:"is_vip"`
	OrganizerID          int     `json:"organizer_id"`
	OrganizerUsername    string  `json:"organizer_username"`
}

func tournamentsToViews(ctx context.Context, h *ClientHandler, tournaments []*models.Tournament) []clientTournamentView {
	result := make([]clientTournamentView, 0, len(tournaments))
	for _, t := range tournaments {
		rounds := 1
		if t.MaxTeams > 1 {
			rounds = int(math.Ceil(math.Log2(float64(t.MaxTeams))))
		}
		banner := ""
		if t.BannerURL != nil {
			banner = *t.BannerURL
		}
		orgName := ""
		if u, err := h.userRepo.FindByID(ctx, t.OrganizerID); err == nil && u != nil {
			orgName = u.Username
		}
		result = append(result, clientTournamentView{
			ID:                   t.ID,
			Title:                t.Title,
			Game:                 t.Game,
			MaxTeams:             t.MaxTeams,
			NumberRounds:         rounds,
			InfoTournament:       t.Description,
			Description:          t.Description,
			Status:               string(t.Status),
			StartDate:            t.StartDate.Format(time.RFC3339),
			RegistrationDeadline: t.RegistrationDeadline.Format(time.RFC3339),
			EntryFee:             t.EntryFee,
			PrizePool:            t.PrizePool,
			BannerURL:            banner,
			IsVIP:                t.IsVIP,
			OrganizerID:          t.OrganizerID,
			OrganizerUsername:    orgName,
		})
	}
	return result
}

func parseClientTournamentFilter(r *http.Request) repository.ClientTournamentFilter {
	f := repository.ClientTournamentFilter{}
	if v := r.URL.Query().Get("organizer_id"); v != "" {
		if id, err := strconv.Atoi(v); err == nil {
			f.OrganizerID = id
		}
	}
	if v := r.URL.Query().Get("date_from"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.DateFrom = &t
		}
	}
	if v := r.URL.Query().Get("date_to"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			end := t.Add(24*time.Hour - time.Second)
			f.DateTo = &end
		}
	}
	if v := r.URL.Query().Get("is_vip"); v != "" {
		b := v == "true" || v == "1"
		f.IsVIP = &b
	}
	return f
}

// GetTournaments — список турниров с фильтрами
func (h *ClientHandler) GetTournaments(w http.ResponseWriter, r *http.Request) {
	tournaments, err := h.tournamentRepo.ListForClient(r.Context(), parseClientTournamentFilter(r))
	if err != nil {
		log.Printf("GetTournaments: %v", err)
		http.Error(w, "Failed to fetch tournaments", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tournamentsToViews(r.Context(), h, tournaments))
}

// GetTournamentOrganizers — список организаторов для фильтра
func (h *ClientHandler) GetTournamentOrganizers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.tournamentRepo.ListClientOrganizers(r.Context())
	if err != nil {
		http.Error(w, "Failed to list organizers", http.StatusInternalServerError)
		return
	}
	type row struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
	}
	out := make([]row, 0, len(rows))
	for _, o := range rows {
		out = append(out, row{ID: o.ID, Username: o.Username})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// RegisterForTournament — заявка на турнир (PostgreSQL)
func (h *ClientHandler) RegisterForTournament(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if h.banRepo != nil {
		isTournamentBanned, err := h.banRepo.IsUserBanned(r.Context(), userID, models.BanTypeTournament)
		if err != nil {
			log.Printf("RegisterForTournament: ban check skipped for user %d: %v", userID, err)
		} else if isTournamentBanned {
			http.Error(w, "Участие в турнирах заблокировано", http.StatusForbidden)
			return
		}
	}

	var req struct {
		TournamentID int    `json:"tournament_id"`
		TeamID       string `json:"team_id"`
		TeamName     string `json:"team_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.TournamentID <= 0 {
		http.Error(w, "Tournament ID required", http.StatusBadRequest)
		return
	}

	tournament, err := h.tournamentRepo.FindByID(r.Context(), req.TournamentID)
	if err != nil || tournament == nil {
		http.Error(w, "Tournament not found", http.StatusNotFound)
		return
	}
	if tournament.Status != models.TournamentStatusApproved {
		http.Error(w, "Турнир не открыт для регистрации", http.StatusBadRequest)
		return
	}
	if time.Now().After(tournament.RegistrationDeadline) {
		http.Error(w, "Срок регистрации истёк", http.StatusBadRequest)
		return
	}
	if tournament.IsVIP && !h.HasActiveSubscription(r.Context(), userID) {
		http.Error(w, "VIP-турнир доступен только с активной подпиской", http.StatusForbidden)
		return
	}

	teamName := req.TeamName
	if req.TeamID != "" {
		if h.mongoDB == nil {
			http.Error(w, "MongoDB unavailable", http.StatusServiceUnavailable)
			return
		}
		team, err := h.findTeamByID(r.Context(), req.TeamID)
		if err != nil || team == nil {
			http.Error(w, "Команда не найдена", http.StatusBadRequest)
			return
		}
		if team.LeaderID != userID {
			http.Error(w, "Только лидер команды может подать заявку", http.StatusForbidden)
			return
		}
		teamName = team.Name
	}
	if teamName == "" {
		u, _ := h.userRepo.FindByID(r.Context(), userID)
		if u != nil {
			teamName = u.Username
		}
	}

	registration, err := h.registrationRepo.Create(r.Context(), req.TournamentID, userID, teamName)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "already registered") {
			http.Error(w, "Вы уже подали заявку на этот турнир", http.StatusConflict)
			return
		}
		log.Printf("RegisterForTournament: create failed user=%d tournament=%d: %v", userID, req.TournamentID, err)
		http.Error(w, "Не удалось отправить заявку", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(registration)
}

// GetMyRegistrations — мои заявки на турниры
func (h *ClientHandler) GetMyRegistrations(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	regs, err := h.registrationRepo.ListByUser(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to load registrations", http.StatusInternalServerError)
		return
	}
	type item struct {
		ID              int    `json:"id"`
		TournamentID    int    `json:"tournament_id"`
		TournamentTitle string `json:"tournament_title"`
		TeamName        string `json:"team_name"`
		Status          string `json:"status"`
		RegisteredAt    string `json:"registered_at"`
	}
	out := make([]item, 0, len(regs))
	for _, reg := range regs {
		title := ""
		if t, _ := h.tournamentRepo.FindByID(r.Context(), reg.TournamentID); t != nil {
			title = t.Title
		}
		out = append(out, item{
			ID: reg.ID, TournamentID: reg.TournamentID, TournamentTitle: title,
			TeamName: reg.TeamName, Status: string(reg.Status),
			RegisteredAt: reg.RegisteredAt.Format(time.RFC3339),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// CancelRegistration — отмена своей заявки
func (h *ClientHandler) CancelRegistration(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	if err := h.registrationRepo.DeletePending(r.Context(), id, userID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Заявка отменена"})
}

// ListRegistrationApplications — заявки для организатора или все для менеджера
func (h *ClientHandler) ListRegistrationApplications(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	role, _ := middleware.GetUserRole(r.Context())
	if role != "manager" && role != "organizer" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	status := models.RegistrationStatus(r.URL.Query().Get("status"))
	all := role == "manager"
	apps, err := h.registrationRepo.ListApplications(r.Context(), userID, all, status)
	if err != nil {
		http.Error(w, "Failed to list applications", http.StatusInternalServerError)
		return
	}

	type view struct {
		ID                int    `json:"id"`
		TournamentID      int    `json:"tournament_id"`
		TournamentTitle   string `json:"tournament_title"`
		OrganizerID       int    `json:"organizer_id"`
		OrganizerUsername string `json:"organizer_username"`
		UserID            int    `json:"user_id"`
		Username          string `json:"username"`
		Email             string `json:"email"`
		TeamName          string `json:"team_name"`
		Status            string `json:"status"`
		PaymentStatus     string `json:"payment_status"`
		RegisteredAt      string `json:"registered_at"`
	}
	out := make([]view, 0, len(apps))
	for _, a := range apps {
		out = append(out, view{
			ID: a.ID, TournamentID: a.TournamentID, TournamentTitle: a.TournamentTitle,
			OrganizerID: a.OrganizerID, OrganizerUsername: a.OrganizerUsername,
			UserID: a.UserID, Username: a.Username, Email: a.Email,
			TeamName: a.TeamName, Status: string(a.Status), PaymentStatus: string(a.PaymentStatus),
			RegisteredAt: a.RegisteredAt.Format(time.RFC3339),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}
