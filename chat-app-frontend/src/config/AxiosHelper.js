import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const websocketBaseURL = import.meta.env.VITE_WS_URL || baseURL.replace(/^http/, 'ws');

export const httpClient = axios.create({
    baseURL: baseURL,
});

httpClient.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

httpClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
                try {
                    const response = await axios.post(`${baseURL}/api/auth/token/refresh/`, {
                        refresh: refreshToken,
                    });
                    const { access } = response.data;
                    useAuthStore.getState().setAuth(access, refreshToken);
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return httpClient(originalRequest);
                } catch (refreshError) {
                    useAuthStore.getState().logout();
                    return Promise.reject(refreshError);
                }
            }
        }
        return Promise.reject(error);
    }
);
