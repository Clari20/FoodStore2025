/** Instancia Axios base con interceptors JWT. */
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const axiosClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Interceptor: maneja 401 (token expirado o no autenticado)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthRequest = requestUrl.includes("/auth/");

    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('authStore');
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
