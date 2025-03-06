import axios from "axios";
import _ from "lodash";
import { GeminiResponse } from "~/domain/video/video.types";
import { env } from "~/env";

export const GeminiHttpClient = axios.create({
  baseURL: env.GEMINI_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const prompting = async (prompt: string) => {
  const data = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };
  const res = await GeminiHttpClient.post(
    `/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GOOGLE_API_KEY}`,
    data
  );

  return _.first(
    _.first((res.data as GeminiResponse).candidates)?.content.parts
  )?.text as string;
};
