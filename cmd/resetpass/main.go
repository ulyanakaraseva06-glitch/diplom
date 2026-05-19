// Утилита сброса пароля: go run ./cmd/resetpass -email ul1@mail.ru -password новый_пароль
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"esports-manager/internal/config"
	"esports-manager/internal/db"
	"esports-manager/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	email := flag.String("email", "", "Email пользователя")
	password := flag.String("password", "", "Новый пароль")
	flag.Parse()

	if *email == "" || *password == "" {
		fmt.Println("Использование: go run ./cmd/resetpass -email user@mail.ru -password ваш_пароль")
		os.Exit(1)
	}

	cfg := config.Load()
	database, err := db.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("PostgreSQL: %v", err)
	}
	defer database.Close()

	userRepo := repository.NewUserRepository(database)
	user, err := userRepo.FindByEmail(context.Background(), *email)
	if err != nil {
		log.Fatalf("Ошибка поиска: %v", err)
	}
	if user == nil {
		log.Fatalf("Пользователь с email %q не найден в PostgreSQL (база %s)", *email, cfg.DBName)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt: %v", err)
	}
	if err := userRepo.UpdatePasswordHash(context.Background(), user.ID, string(hash)); err != nil {
		log.Fatalf("Обновление пароля: %v", err)
	}

	fmt.Printf("Пароль обновлён для id=%d email=%s username=%s role=%s\n", user.ID, user.Email, user.Username, user.Role)
}
