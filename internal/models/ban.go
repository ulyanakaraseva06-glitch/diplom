package models

import (
    "time"
)

type BanType string

const (
    BanTypeTournament BanType = "tournament_ban" // запрет на турниры
    BanTypeChat       BanType = "chat_ban"       // запрет на чат
    BanTypeFull       BanType = "full_ban"       // полная блокировка
    BanTypeTeam       BanType = "team_ban"       // запрет на создание команд
    BanTypeWarning    BanType = "warning"        // предупреждение
)

type Ban struct {
    ID          int        `json:"id"`
    UserID      int        `json:"user_id"`
    ModeratorID int        `json:"moderator_id"`
    BanType     BanType    `json:"ban_type"`
    Reason      string     `json:"reason"`
    Comment     string     `json:"comment,omitempty"`
    BannedAt    time.Time  `json:"banned_at"`
    ExpiresAt   *time.Time `json:"expires_at,omitempty"`
    IsActive    bool       `json:"is_active"`
}

type BanRequest struct {
    UserID    int        `json:"user_id"`
    BanType   BanType    `json:"ban_type"`
    Reason    string     `json:"reason"`
    Comment   string     `json:"comment,omitempty"`
    ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

type BanResponse struct {
    ID            int        `json:"id"`
    UserID        int        `json:"user_id"`
    Username      string     `json:"username"`
    ModeratorID   int        `json:"moderator_id"`
    ModeratorName string     `json:"moderator_name"`
    BanType       BanType    `json:"ban_type"`
    BanTypeLabel  string     `json:"ban_type_label"`
    Reason        string     `json:"reason"`
    Comment       string     `json:"comment,omitempty"`
    BannedAt      time.Time  `json:"banned_at"`
    ExpiresAt     *time.Time `json:"expires_at,omitempty"`
    IsActive      bool       `json:"is_active"`
}

func (b BanType) Label() string {
    switch b {
    case BanTypeTournament:
        return "Запрет на участие в турнирах"
    case BanTypeChat:
        return "Запрет на отправку сообщений"
    case BanTypeFull:
        return "Полная блокировка аккаунта"
    case BanTypeTeam:
        return "Запрет на создание команд"
    case BanTypeWarning:
        return "Предупреждение"
    default:
        return string(b)
    }
}