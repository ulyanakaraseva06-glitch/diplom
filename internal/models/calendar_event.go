package models

import "time"

type CalendarEvent struct {
    ID          int       `json:"id"`
    UserID      int       `json:"user_id"`
    Title       string    `json:"title"`
    Description string    `json:"description,omitempty"`
    StartDate   time.Time `json:"start_date"`
    EndDate     time.Time `json:"end_date"`
    AllDay      bool      `json:"all_day"`
    EventType   string    `json:"event_type"` // "tournament", "note", "task"
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}