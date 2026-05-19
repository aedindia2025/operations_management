import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";

const TOKEN_STORAGE_KEY = "otm_token";
const USER_STORAGE_KEY = "otm_user";
const LAST_ACTIVITY_STORAGE_KEY = "otm_last_activity_at";

function normalizePath(value?: string) {
  const raw = (value || "/").trim();
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

export function getAppBasePath() {
  return normalizePath(import.meta.env.BASE_URL);
}

export function getApiBaseUrl() {
  const { protocol, hostname, port } = window.location;
  const appBasePath = getAppBasePath();

  if (port === "5173") {
    return "/api";
  }

  const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBase) {
    if (envBase.startsWith("http://") || envBase.startsWith("https://")) {
      return envBase.replace(/\/+$/, "");
    }
    return `/${envBase.replace(/^\/+|\/+$/g, "")}`;
  }

  const apiHost =
    hostname === "localhost" || hostname === "127.0.0.1"
      ? "localhost"
      : hostname;

  if (appBasePath) {
    return `${appBasePath}/api`;
  }

  return `${protocol}//${apiHost}:7000/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
      window.location.href = `${getAppBasePath() || ""}/login`;
    }
    return Promise.reject(err);
  }
);

export default api;
