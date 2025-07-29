// src/lib/api.ts
import axios from 'axios';

// --- KUNCI PERBAIKAN ---
// Ambil URL API dari environment variable. Jika tidak ada (saat di lokal),
// gunakan localhost sebagai default.
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: `${baseURL}/api/shops`, // Atur base URL yang benar
});

// Interceptor untuk menyertakan token
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Interceptor untuk menangani token kedaluwarsa
api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                // Gunakan URL lengkap untuk refresh token
                const response = await axios.post(`${baseURL}/api/token/refresh/`, {
                    refresh: refreshToken,
                });
                const { access } = response.data;
                localStorage.setItem('accessToken', access);
                originalRequest.headers['Authorization'] = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
