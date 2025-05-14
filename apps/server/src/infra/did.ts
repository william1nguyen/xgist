import axios from "axios";
import { env } from "~/env";

export const didHttpClient = axios.create({
  baseURL: env.WHISPERAI_URL,
  timeout: 30 * 60 * 1000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  headers: {
    "x-api-key": env.X_API_KEY,
  },
});

export const createTalk = async (
  agent_image: string,
  agent_voice_id: string,
  text: string
) => {
  const res = await didHttpClient.post("/create-talk", {
    agent_image,
    agent_voice_id,
    text,
  });

  return res.data;
};

export const getTalkStatus = async (id: string) => {
  const res = await didHttpClient.get(`/get-talk-status?id=${id}`);
  return res.data;
};

export const getTalk = async () => {
  const res = await didHttpClient.post("/get-talk", {});
  return res.data;
};
