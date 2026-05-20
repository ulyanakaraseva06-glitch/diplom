package models

import "time"

const (
	WalletDepositPending  = "pending"
	WalletDepositReview   = "review"
	WalletDepositPaid     = "paid"
	WalletDepositRejected = "rejected"
)

type WalletDeposit struct {
	ID         string    `json:"id" bson:"id"`
	UserID     int       `json:"user_id" bson:"user_id"`
	Amount     float64   `json:"amount" bson:"amount"`
	Status     string    `json:"status" bson:"status"`
	Purpose    string    `json:"purpose" bson:"purpose"`
	QRPayload  string    `json:"qr_payload,omitempty" bson:"qr_payload,omitempty"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
	ReviewedAt time.Time `json:"reviewed_at,omitempty" bson:"reviewed_at,omitempty"`
	PaidAt     time.Time `json:"paid_at,omitempty" bson:"paid_at,omitempty"`
}

type WalletDepositAdminView struct {
	WalletDeposit
	Username string `json:"username"`
	Email    string `json:"email"`
}
