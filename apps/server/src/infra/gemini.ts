import axios from "axios";
import { env } from "~/env";

export const GeminiHttpClient = axios.create({
  baseURL: env.GEMINI_URL,
  params: {
    key: env.GOOGLE_API_KEY,
  },
  headers: {
    "Content-Type": "application/json",
  },
});

export const prompting = async (prompt: string) => {
  const data = {
    content: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };
  const res = GeminiHttpClient.post(
    "/v1beta/models/gemini-2.0-flash:generateContent",
    data
  );

  return res;
};
