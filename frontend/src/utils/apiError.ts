import axios from 'axios';

/** Текст ошибки из ответа API (Go http.Error или JSON { message }) */
export function getApiErrorMessage(err: unknown, fallback = 'Ошибка запроса'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === 'string' && data.trim()) {
      return data.trim();
    }
    if (data && typeof data === 'object' && 'message' in data) {
      const msg = (data as { message?: string }).message;
      if (msg) return msg;
    }
    if (err.response?.status === 401) {
      return 'Неверный email или пароль';
    }
    if (err.response?.status === 500) {
      return 'Ошибка сервера. Проверьте PostgreSQL и логи backend';
    }
    if (!err.response) {
      return 'Сервер недоступен. Запустите backend: go run . (папка cmd/server)';
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
