package handlers

import (
    "encoding/json"
    "net/http"
    "esports-manager/internal/repository"
)

type StatsHandler struct {
    registrationRepo *repository.RegistrationRepository
    supportRepo       *repository.SupportRepository
}

func NewStatsHandler(regRepo *repository.RegistrationRepository, supRepo *repository.SupportRepository) *StatsHandler {
    return &StatsHandler{
        registrationRepo: regRepo,
        supportRepo:       supRepo,
    }
}

// GetStats - получение статистики для дашборда
func (h *StatsHandler) GetStats(w http.ResponseWriter, r *http.Request) {
    totalRegistrations, _ := h.registrationRepo.CountAll(r.Context())
    unreadMessages, _ := h.supportRepo.GetTotalUnreadCountForManagers(r.Context())

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "total_registrations": totalRegistrations,
        "unread_messages":     unreadMessages,
    })
}