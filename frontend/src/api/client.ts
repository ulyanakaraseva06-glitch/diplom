import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';  // Убедись, что здесь http://localhost:8080/api

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) {
      error.message = data.trim();
    } else if (data?.message) {
      error.message = data.message;
    }
    return Promise.reject(error);
  }
);