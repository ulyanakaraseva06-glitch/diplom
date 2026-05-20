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

type CalendarHandler struct {
    calendarRepo   *repository.CalendarRepository
    tournamentRepo *repository.TournamentRepository
}

func NewCalendarHandler(calendarRepo *repository.CalendarRepository, tournamentRepo *repository.TournamentRepository) *CalendarHandler {
    return &CalendarHandler{
        calendarRepo:   calendarRepo,
        tournamentRepo: tournamentRepo,
    }
}

// GetEvents - получение событий пользователя
func (h *CalendarHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    startDateStr := r.URL.Query().Get("start_date")
    endDateStr := r.URL.Query().Get("end_date")
    var startDate, endDate *time.Time

    if startDateStr != "" {
        t, err := time.Parse(time.RFC3339, startDateStr)
        if err == nil {
            startDate = &t
        }
    }
    if endDateStr != "" {
        t, err := time.Parse(time.RFC3339, endDateStr)
        if err == nil {
            endDate = &t
        }
    }

    events, err := h.calendarRepo.GetByUserID(r.Context(), userID, startDate, endDate)
    if err != nil {
        http.Error(w, "Failed to get events", http.StatusInternalServerError)
        return
    }

    tournaments, _ := h.tournamentRepo.ListByOrganizer(r.Context(), userID)

    for _, t := range tournaments {
        endDateTournament := t.StartDate.Add(24 * time.Hour)
        events = append(events, &models.CalendarEvent{
            ID:          -t.ID,
            UserID:      userID,
            Title:       t.Title,
            Description: t.Description,
            StartDate:   t.StartDate,
            EndDate:     endDateTournament,
            EventType:   "tournament",
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(events)
}

// CreateEvent - создание события
func (h *CalendarHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req models.CalendarEvent
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    req.UserID = userID
    event, err := h.calendarRepo.Create(r.Context(), &req)
    if err != nil {
        http.Error(w, "Failed to create event", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(event)
}

// UpdateEvent - обновление события
func (h *CalendarHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid event ID", http.StatusBadRequest)
        return
    }

    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var req models.CalendarEvent
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    event, err := h.calendarRepo.Update(r.Context(), id, userID, &req)
    if err != nil {
        http.Error(w, "Failed to update event", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(event)
}

// DeleteEvent - удаление события
func (h *CalendarHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid event ID", http.StatusBadRequest)
        return
    }

    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    if err := h.calendarRepo.Delete(r.Context(), id, userID); err != nil {
        http.Error(w, "Failed to delete event", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}