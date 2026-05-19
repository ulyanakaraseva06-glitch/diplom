package handlers

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "strings"
    "time"

    "esports-manager/internal/middleware"
    "esports-manager/internal/utils"
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
        http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
        return
    }

    fmt.Printf("[Upload] User %d uploading banner\n", userID)

    // Ограничение на размер файла (5MB)
    if err := r.ParseMultipartForm(5 << 20); err != nil {
        http.Error(w, `{"error": "File too large, max 5MB"}`, http.StatusBadRequest)
        return
    }

    file, handler, err := r.FormFile("banner")
    if err != nil {
        http.Error(w, `{"error": "Failed to get file"}`, http.StatusBadRequest)
        return
    }
    defer file.Close()

    // Проверяем тип файла
    allowedTypes := map[string]bool{
        "image/jpeg": true,
        "image/png":  true,
        "image/gif":  true,
        "image/webp": true,
    }
    
    contentType := handler.Header.Get("Content-Type")
    if !allowedTypes[contentType] {
        http.Error(w, `{"error": "Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed"}`, http.StatusBadRequest)
        return
    }

    // Получаем корень проекта
    projectRoot := utils.GetProjectRoot()
    uploadDir := filepath.Join(projectRoot, "uploads", "banners")
    
    fmt.Printf("[Upload] Project root: %s\n", projectRoot)
    fmt.Printf("[Upload] Upload directory: %s\n", uploadDir)
    
    // Создаем директорию, если её нет
    if err := os.MkdirAll(uploadDir, 0755); err != nil {
        fmt.Printf("[Upload] Failed to create directory: %v\n", err)
        http.Error(w, `{"error": "Failed to create upload directory"}`, http.StatusInternalServerError)
        return
    }

    // Создаем уникальное имя файла
    ext := strings.ToLower(filepath.Ext(handler.Filename))
    if ext == "" {
        ext = ".jpg"
    }
    filename := fmt.Sprintf("banner_%d_%d%s", userID, time.Now().UnixNano(), ext)
    filePath := filepath.Join(uploadDir, filename)

    // Сохраняем файл
    dst, err := os.Create(filePath)
    if err != nil {
        fmt.Printf("[Upload] Failed to create file: %v\n", err)
        http.Error(w, `{"error": "Failed to save file"}`, http.StatusInternalServerError)
        return
    }
    defer dst.Close()

    written, err := io.Copy(dst, file)
    if err != nil {
        fmt.Printf("[Upload] Failed to copy file: %v\n", err)
        http.Error(w, `{"error": "Failed to save file"}`, http.StatusInternalServerError)
        return
    }

    fmt.Printf("[Upload] Bytes written: %d\n", written)
    
    // Относительный URL для доступа к файлу
    bannerURL := "/uploads/banners/" + filename
    
    fmt.Printf("[Upload] Banner URL: %s\n", bannerURL)
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "url": bannerURL,
    })
}

// UploadImage — загрузка изображения (аватар, чат)
func (h *UploadHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, `{"error": "File too large, max 5MB"}`, http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, `{"error": "Failed to get file"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	allowedTypes := map[string]bool{
		"image/jpeg": true, "image/png": true, "image/gif": true, "image/webp": true,
	}
	contentType := handler.Header.Get("Content-Type")
	if !allowedTypes[contentType] {
		http.Error(w, `{"error": "Invalid file type"}`, http.StatusBadRequest)
		return
	}

	projectRoot := utils.GetProjectRoot()
	uploadDir := filepath.Join(projectRoot, "uploads", "images")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, `{"error": "Failed to create directory"}`, http.StatusInternalServerError)
		return
	}

	ext := strings.ToLower(filepath.Ext(handler.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("img_%d_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, `{"error": "Failed to save file"}`, http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, `{"error": "Failed to save file"}`, http.StatusInternalServerError)
		return
	}

	imageURL := "http://localhost:8080/uploads/images/" + filename
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": imageURL})
}