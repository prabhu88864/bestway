import axios from "axios";
import { BASE_URL } from "../API/Constants"

const axiosInstance = axios.create({
  baseURL: BASE_URL, // "http://localhost:3000/"
});

// ✅ Automatically attach token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
