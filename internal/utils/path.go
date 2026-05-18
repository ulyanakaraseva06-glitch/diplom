package utils

import (
    "path/filepath"
    "runtime"
)

// GetProjectRoot возвращает абсолютный путь к корню проекта
func GetProjectRoot() string {
    _, filename, _, _ := runtime.Caller(0)
    // Идем наверх: utils -> internal -> корень проекта
    return filepath.Dir(filepath.Dir(filepath.Dir(filename)))
}