package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
     "log"

    "esports-manager/internal/middleware"
    "esports-manager/internal/repository"
)

type LogsHandler struct {
    logRepo *repository.ManagerLogRepository
}

func NewLogsHandler(logRepo *repository.ManagerLogRepository) *LogsHandler {
    return &LogsHandler{logRepo: logRepo}
}

// GetLogs - получить список логов (только для менеджеров)
func (h *LogsHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
    role, _ := middleware.GetUserRole(r.Context())
    if role != "manager" {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    limit := 100
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

    logs, err := h.logRepo.List(r.Context(), limit, offset)
    if err != nil {
        log.Printf("List error: %v", err)
        http.Error(w, "Failed to get logs: "+err.Error(), http.StatusInternalServerError)
        return
    }

    total, err := h.logRepo.Count(r.Context())
    if err != nil {
        log.Printf("Count error: %v", err)
        total = 0
    }

    response := map[string]interface{}{
        "logs":  logs,
        "total": total,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}