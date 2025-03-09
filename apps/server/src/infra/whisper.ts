import axios from "axios";
import { env } from "~/env";
import FormData from "form-data";
import logger from "./logger";

export const whisperHttpClient = axios.create({
  baseURL: env.WHISPERAI_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const transcribe = async (buffer: Buffer, filename = "filename.mp4") => {
  try {
    const form = new FormData();

    form.append("file", buffer, {
      filename,
      contentType: "video/mp4",
      knownLength: buffer.length,
    });

    const res = await whisperHttpClient.post("/transcribe", form, {
      headers: {
        ...form.getHeaders(),
        Accept: "application/json",
      },
    });
    const data = res.data;
    console.log(data);
    return data;
  } catch (err) {
    logger.error(`Failed to get transcript ${err}`);
    return null;
  }
};
