package handlers

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "time"

    "esports-manager/internal/middleware"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
    return &UploadHandler{}
}

// UploadBanner - загрузка баннера турнира
func (h *UploadHandler) UploadBanner(w http.ResponseWriter, r *http.Request) {
    // Проверяем авторизацию
    userID, ok := middleware.GetUserID(r.Context())
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    fmt.Printf("UploadBanner: user %d uploading file\n", userID)

    // Ограничение на размер файла (5MB)
    err := r.ParseMultipartForm(5 << 20)
    if err != nil {
        http.Error(w, "File too large", http.StatusBadRequest)
        return
    }

    file, handler, err := r.FormFile("banner")
    if err != nil {
        http.Error(w, "Failed to get file", http.StatusBadRequest)
        return
    }
    defer file.Close()

    fmt.Printf("UploadBanner: received file %s, size %d\n", handler.Filename, handler.Size)

    // Проверяем тип файла
    allowedTypes := map[string]bool{
        "image/jpeg": true,
        "image/png":  true,
        "image/gif":  true,
        "image/webp": true,
    }
    
    contentType := handler.Header.Get("Content-Type")
    if !allowedTypes[contentType] {
        http.Error(w, "Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed", http.StatusBadRequest)
        return
    }

    // Создаем уникальное имя файла
    ext := filepath.Ext(handler.Filename)
    filename := fmt.Sprintf("tournament_%d_%d%s", userID, time.Now().UnixNano(), ext)
    
    // Создаем директорию для загрузок, если её нет
    uploadDir := "uploads/banners"
    if err := os.MkdirAll(uploadDir, 0755); err != nil {
        fmt.Printf("UploadBanner: failed to create directory: %v\n", err)
        http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
        return
    }

    // Сохраняем файл
    filePath := filepath.Join(uploadDir, filename)
    dst, err := os.Create(filePath)
    if err != nil {
        fmt.Printf("UploadBanner: failed to create file: %v\n", err)
        http.Error(w, "Failed to save file", http.StatusInternalServerError)
        return
    }
    defer dst.Close()

    if _, err := io.Copy(dst, file); err != nil {
        fmt.Printf("UploadBanner: failed to copy file: %v\n", err)
        http.Error(w, "Failed to save file", http.StatusInternalServerError)
        return
    }

    // Возвращаем URL для доступа к файлу
    bannerURL := fmt.Sprintf("/uploads/banners/%s", filename)
    
    fmt.Printf("UploadBanner: file saved successfully, URL: %s\n", bannerURL)
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "url": bannerURL,
    })
}