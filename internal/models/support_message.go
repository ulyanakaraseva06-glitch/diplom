package models

import (
    "time"
)

type SupportMessage struct {
    ID         int       `json:"id"`
    UserID     int       `json:"user_id"`
    ManagerID  *int      `json:"manager_id,omitempty"`
    Message    string    `json:"message"`
    IsFromUser bool      `json:"is_from_user"`
    IsRead     bool      `json:"is_read"`
    CreatedAt  time.Time `json:"created_at"`
}

type SupportMessageCreate struct {
    Message string `json:"message"`
}

type SupportMessageResponse struct {
    ID          int       `json:"id"`
    UserID      int       `json:"user_id"`
    Username    string    `json:"username,omitempty"`
    ManagerID   *int      `json:"manager_id,omitempty"`
    ManagerName string    `json:"manager_name,omitempty"`
    Message     string    `json:"message"`
    IsFromUser  bool      `json:"is_from_user"`
    IsRead      bool      `json:"is_read"`
    CreatedAt   time.Time `json:"created_at"`
}