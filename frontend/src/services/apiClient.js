import axios from "axios";
import API_BASE_URL from "../utils/api";
import { clearStoredAuth, getStoredToken } from "../utils/authStorage";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth();
      delete apiClient.defaults.headers.common.Authorization;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mmt:auth-cleared"));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
