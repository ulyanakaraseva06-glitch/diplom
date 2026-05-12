package models

import (
    "time"
)

type RegistrationStatus string

const (
    RegistrationStatusPending  RegistrationStatus = "pending"
    RegistrationStatusApproved RegistrationStatus = "approved"
    RegistrationStatusRejected RegistrationStatus = "rejected"
)

type PaymentStatus string

const (
    PaymentStatusPending PaymentStatus = "pending"
    PaymentStatusPaid    PaymentStatus = "paid"
    PaymentStatusRefunded PaymentStatus = "refunded"
)

type TournamentRegistration struct {
    ID            int                `json:"id"`
    TournamentID  int                `json:"tournament_id"`
    UserID        int                `json:"user_id"`
    TeamName      string             `json:"team_name"`
    Status        RegistrationStatus `json:"status"`
    PaymentStatus PaymentStatus      `json:"payment_status"`
    RegisteredAt  time.Time          `json:"registered_at"`
    ApprovedBy    *int               `json:"approved_by,omitempty"`
    ApprovedAt    *time.Time         `json:"approved_at,omitempty"`
}

type RegistrationRequest struct {
    TournamentID int    `json:"tournament_id"`
    TeamName     string `json:"team_name"`
}

type RegistrationResponse struct {
    ID             int                `json:"id"`
    TournamentID   int                `json:"tournament_id"`
    TournamentTitle string             `json:"tournament_title,omitempty"`
    UserID         int                `json:"user_id"`
    Username       string             `json:"username,omitempty"`
    TeamName       string             `json:"team_name"`
    Status         RegistrationStatus `json:"status"`
    PaymentStatus  PaymentStatus      `json:"payment_status"`
    RegisteredAt   time.Time          `json:"registered_at"`
}