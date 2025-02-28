import axios from "axios";
import FormData from "form-data";
import { env } from "~/env";
import logger from "~/infra/logger";

export const transcribe = async (buffer: Buffer, name: string) => {
  try {
    const form = new FormData();

    form.append("files", buffer, {
      filename: name,
      contentType: "video/mp4",
      knownLength: buffer.length,
    });

    const res = await axios.post(`${env.WHISPERAI_URL}`, form, {
      headers: {
        ...form.getHeaders(),
        Accept: "application/json",
      },
    });
    const data = res.data;

    return data.transcriptions[name];
  } catch (err) {
    logger.error(`Failed to transcribe: ${err}`);
  }
};
