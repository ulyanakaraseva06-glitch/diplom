package models

import (
    "time"
)

type TournamentStatus string

const (
    TournamentStatusPending   TournamentStatus = "pending"
    TournamentStatusApproved  TournamentStatus = "approved"
    TournamentStatusOngoing   TournamentStatus = "ongoing"
    TournamentStatusCompleted TournamentStatus = "completed"
    TournamentStatusCancelled TournamentStatus = "cancelled"
)

type Tournament struct {
    ID                   int              `json:"id"`
    Title                string           `json:"title"`
    Game                 string           `json:"game"`
    Description          string           `json:"description,omitempty"`
    StartDate            time.Time        `json:"start_date"`
    RegistrationDeadline time.Time        `json:"registration_deadline"`
    EntryFee             float64          `json:"entry_fee"`
    PrizePool            float64          `json:"prize_pool"`
    MaxTeams             int              `json:"max_teams"`
    Status               TournamentStatus `json:"status"`
    OrganizerID          int              `json:"organizer_id"`
    ApprovedBy           *int             `json:"approved_by,omitempty"`
    ApprovedAt           *time.Time       `json:"approved_at,omitempty"`
    CreatedAt            time.Time        `json:"created_at"`
    UpdatedAt            time.Time        `json:"updated_at"`
}

type TournamentCreate struct {
    Title                string           `json:"title"`
    Game                 string           `json:"game"`
    Description          string           `json:"description"`
    StartDate            time.Time        `json:"start_date"`
    RegistrationDeadline time.Time        `json:"registration_deadline"`
    EntryFee             float64          `json:"entry_fee"`
    PrizePool            float64          `json:"prize_pool"`
    MaxTeams             int              `json:"max_teams"`
}

type TournamentUpdate struct {
    Title                string           `json:"title"`
    Game                 string           `json:"game"`
    Description          string           `json:"description"`
    StartDate            time.Time        `json:"start_date"`
    RegistrationDeadline time.Time        `json:"registration_deadline"`
    EntryFee             *float64         `json:"entry_fee"`
    PrizePool            *float64         `json:"prize_pool"`
    MaxTeams             *int             `json:"max_teams"`
    Status               TournamentStatus `json:"status"`
}