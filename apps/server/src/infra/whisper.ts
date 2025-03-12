import axios from "axios";
import { env } from "~/env";

export const whisperHttpClient = axios.create({
  baseURL: env.WHISPERAI_URL,
  timeout: 30 * 60 * 1000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

export const transcribe = async (buffer: Buffer, filename = "filename.mp4") => {
  try {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "video/mp4" }), filename);

    const res = await whisperHttpClient.post("/transcribe", form, {
      headers: { Accept: "application/json" },
    });

    return res.data;
  } catch (err) {
    throw new Error(`Failed to transcribe ${err}`);
  }
};

export const transcribeStream = async (
  buffer: Buffer,
  filename = "filename.mp4",
  onProgress?: (percent: number) => void
) => {
  try {
    const totalSize = buffer.length;

    const res = await whisperHttpClient.post("/transcribe-stream/", buffer, {
      headers: {
        "Content-Type": "video/mp4",
        Accept: "application/json",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const total = progressEvent.total || totalSize;
          const percentCompleted = total
            ? Math.round((progressEvent.loaded * 100) / total)
            : -1;
          onProgress(percentCompleted);
        }
      },
    });

    return res.data;
  } catch (err) {
    throw new Error(`Failed to transcribe ${err}`);
  }
};

export const transcribeFile = async (
  file: File,
  onProgress?: (percent: number) => void
) => {
  try {
    if (file.size > 100 * 1024 * 1024) {
      const buffer = await file.arrayBuffer();
      return await transcribeStream(Buffer.from(buffer), file.name, onProgress);
    } else {
      const form = new FormData();
      form.append("file", file);

      const res = await whisperHttpClient.post("/transcribe", form, {
        headers: { Accept: "application/json" },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });

      return res.data;
    }
  } catch (err) {
    throw new Error(`Failed to transcribe ${err}`);
  }
};
