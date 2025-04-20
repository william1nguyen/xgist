import axios from "axios";
import { env } from "./env";
import { toast } from "react-toastify";

export const httpClient = axios.create({
  baseURL: env.VITE_BASE_URL,
});

export const aiHttpClient = axios.create({
  baseURL: env.VITE_AI_BASE_URL,
  headers: {
    "x-api-key": env.VITE_AI_AUTH_KEY,
  },
});

httpClient.interceptors.request.use((config) => {
  const oidcStorage = localStorage.getItem(
    `oidc.user:${env.VITE_KEYCLOAK_URL}/realms/${env.VITE_KEYCLOAK_REALM}:${env.VITE_CLIENT_ID}`
  );

  if (oidcStorage) {
    try {
      const authData = JSON.parse(oidcStorage);
      const token = authData.access_token;

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (error) {
      toast.error(`Error parsing OIDC storage: ${error}`);
    }
  }
  return config;
});
