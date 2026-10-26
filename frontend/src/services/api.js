import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise;

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isAuthFlowRequest =
      /\/auth\/(login|register|logout|token\/refresh|forgot-password|verify-reset-otp|reset-password|resend-verification|verify-email)\/?$/.test(
        requestUrl,
      );

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthFlowRequest
    ) {
      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) {
      localStorage.removeItem("accessToken");
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${api.defaults.baseURL.replace(/\/+$/, "")}/auth/token/refresh/`,
            { refresh: storedRefreshToken },
            { headers: { "Content-Type": "application/json" } },
          )
          .then((response) => {
            const { access, refresh } = response.data || {};
            if (!access || !refresh) {
              throw new Error("Token refresh response was incomplete.");
            }
            localStorage.setItem("accessToken", access);
            localStorage.setItem("refreshToken", refresh);
            return access;
          })
          .finally(() => {
            refreshPromise = undefined;
          });
      }

      const accessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      return Promise.reject(refreshError);
    }
  },
);

export default api;