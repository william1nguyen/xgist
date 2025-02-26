import axios from "axios";
import { env } from "./env";

export const httpClient = axios.create({
  baseURL: env.VITE_BASE_URL,
});

export const setUpHttpClient = (token: string) => {
  httpClient.interceptors.request.use((config) => {
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });
};
