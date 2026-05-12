package models

import (
    "time"
)

type Ban struct {
    ID          int        `json:"id"`
    UserID      int        `json:"user_id"`
    ModeratorID int        `json:"moderator_id"`
    Reason      string     `json:"reason"`
    BannedAt    time.Time  `json:"banned_at"`
    ExpiresAt   *time.Time `json:"expires_at,omitempty"`
    IsActive    bool       `json:"is_active"`
}

type BanRequest struct {
    UserID    int        `json:"user_id"`
    Reason    string     `json:"reason"`
    ExpiresAt *time.Time `json:"expires_at"`
}

type BanResponse struct {
    ID            int        `json:"id"`
    UserID        int        `json:"user_id"`
    Username      string     `json:"username"`
    ModeratorID   int        `json:"moderator_id"`
    ModeratorName string     `json:"moderator_name"`
    Reason        string     `json:"reason"`
    BannedAt      time.Time  `json:"banned_at"`
    ExpiresAt     *time.Time `json:"expires_at,omitempty"`
    IsActive      bool       `json:"is_active"`
}