package handlers

import (
    "encoding/json"
    "net/http"
    "time"

    "esports-manager/internal/middleware"
    "esports-manager/internal/repository"
)

type AnalyticsHandler struct {
    tournamentRepo   *repository.TournamentRepository
    registrationRepo *repository.RegistrationRepository
    userRepo         *repository.UserRepository
}

func NewAnalyticsHandler(
    tournamentRepo *repository.TournamentRepository,
    registrationRepo *repository.RegistrationRepository,
    userRepo *repository.UserRepository,
) *AnalyticsHandler {
    return &AnalyticsHandler{
        tournamentRepo:   tournamentRepo,
        registrationRepo: registrationRepo,
        userRepo:         userRepo,
    }
}

// GetTournamentsByMonth - турниры по месяцам
func (h *AnalyticsHandler) GetTournamentsByMonth(w http.ResponseWriter, r *http.Request) {
    role, _ := middleware.GetUserRole(r.Context())
    if role != "manager" {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    // Получаем турниры за последние 6 месяцев
    months := make([]string, 6)
    counts := make([]int, 6)
    
    now := time.Now()
    for i := 5; i >= 0; i-- {
        month := now.AddDate(0, -i, 0)
        monthName := month.Format("Jan")
        months[5-i] = monthName
        
        count, err := h.tournamentRepo.CountByMonth(r.Context(), month.Year(), int(month.Month()))
        if err != nil {
            counts[5-i] = 0
            continue
        }
        counts[5-i] = count
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "months": months,
        "counts": counts,
    })
}

// GetTournamentsByStatus - распределение по статусам
func (h *AnalyticsHandler) GetTournamentsByStatus(w http.ResponseWriter, r *http.Request) {
    role, _ := middleware.GetUserRole(r.Context())
    if role != "manager" {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    stats, err := h.tournamentRepo.CountByStatus(r.Context())
    if err != nil {
        http.Error(w, "Failed to get stats", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(stats)
}

// GetRegistrationsTrend - динамика регистраций
func (h *AnalyticsHandler) GetRegistrationsTrend(w http.ResponseWriter, r *http.Request) {
    role, _ := middleware.GetUserRole(r.Context())
    if role != "manager" {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    dates := make([]string, 30)
    counts := make([]int, 30)
    
    for i := 29; i >= 0; i-- {
        date := time.Now().AddDate(0, 0, -i)
        dateStr := date.Format("02.01")
        dates[29-i] = dateStr
        
        count, err := h.registrationRepo.CountByDate(r.Context(), date)
        if err != nil {
            counts[29-i] = 0
            continue
        }
        counts[29-i] = count
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "dates":  dates,
        "counts": counts,
    })
}

// GetTopOrganizers - топ организаторов по турнирам
func (h *AnalyticsHandler) GetTopOrganizers(w http.ResponseWriter, r *http.Request) {
    role, _ := middleware.GetUserRole(r.Context())
    if role != "manager" {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    organizers, err := h.tournamentRepo.GetTopOrganizers(r.Context(), 5)
    if err != nil {
        http.Error(w, "Failed to get top organizers", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(organizers)
}