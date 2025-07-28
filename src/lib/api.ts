// src/lib/api.ts
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const baseURL = 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL,
});

// Ini adalah "interceptor" atau penjegat. Ia akan berjalan sebelum setiap permintaan dikirim.
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

// Interceptor ini berjalan JIKA sebuah permintaan GAGAL.
api.interceptors.response.use(
    response => response, // Jika sukses, langsung kembalikan respons
    async error => {
        const originalRequest = error.config;

        // Jika error adalah 401 dan ini bukan permintaan refresh token
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Tandai bahwa kita sudah mencoba ulang

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const response = await axios.post(`${baseURL}/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;
                localStorage.setItem('accessToken', access);

                // Perbarui header di permintaan original dan coba lagi
                originalRequest.headers['Authorization'] = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Jika refresh token gagal, logout pengguna
                console.error("Sesi habis, silakan login ulang.", refreshError);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                // Arahkan ke halaman login
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;