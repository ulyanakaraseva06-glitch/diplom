package config

import (
    "log"
    "os"
    "github.com/joho/godotenv"
)

type Config struct {
    DBHost     string
    DBPort     string
    DBUser     string
    DBPassword string
    DBName     string
    JWTSecret  string
    MongoURI    string
    MongoDBName string
}

func Load() *Config {
    loaded := false
    for _, path := range []string{".env", "cmd/server/.env"} {
        if err := godotenv.Load(path); err == nil {
            loaded = true
        }
    }
    if !loaded {
        log.Println("Warning: .env file not found, using environment variables")
    }

    return &Config{
        DBHost:     getEnv("DB_HOST", "localhost"),
        DBPort:     getEnv("DB_PORT", "5432"),
        DBUser:     getEnv("DB_USER", "postgres"),
        DBPassword: getEnv("DB_PASSWORD", "1234"),
        DBName:     getEnv("DB_NAME", "esports_manager"),
        MongoURI:    getEnv("MONGO_URI", "mongodb://localhost:27017"),
        MongoDBName: getEnv("MONGO_DB_NAME", "kib_db"),
        JWTSecret:  getEnv("JWT_SECRET", "default-secret-key"),
        
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}