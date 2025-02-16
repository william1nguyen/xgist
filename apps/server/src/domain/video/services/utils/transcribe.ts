import axios from "axios";
import FormData from "form-data";
import { env } from "~/env";
import logger from "~/infra/logger";

export const getTranscript = async (fileBuffer: Buffer, fileName: string) => {
  try {
    const form = new FormData();

    form.append("files", fileBuffer, {
      filename: fileName,
      contentType: "video/mp4",
      knownLength: fileBuffer.length,
    });

    const res = await axios.post(`${env.WHISPERAI_URL}/transcribe`, form, {
      headers: {
        ...form.getHeaders(),
        Accept: "application/json",
      },
    });
    const data = res.data;

    return data.transcriptions[fileName];
  } catch (err) {
    logger.error(`Failed to get transcript ${err}`);
    return null;
  }
};
