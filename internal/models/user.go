package models

import (
    "time"
)

type UserRole string

const (
    RoleUser      UserRole = "user"
    RoleOrganizer UserRole = "organizer"
    RoleManager   UserRole = "manager"
)

type User struct {
    ID           int       `json:"id"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"`
    Username     string    `json:"username"`
    Role         UserRole  `json:"role"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

type UserCreate struct {
    Email    string `json:"email"`
    Password string `json:"password"`
    Username string `json:"username"`
}

type UserLogin struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type UserResponse struct {
    ID        int       `json:"id"`
    Email     string    `json:"email"`
    Username  string    `json:"username"`
    Role      UserRole  `json:"role"`
    CreatedAt time.Time `json:"created_at"`
}

func (u *User) ToResponse() *UserResponse {
    return &UserResponse{
        ID:        u.ID,
        Email:     u.Email,
        Username:  u.Username,
        Role:      u.Role,
        CreatedAt: u.CreatedAt,
    }
}