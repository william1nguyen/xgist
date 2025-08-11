import axios from "axios";
import { env } from "~/env";

export const whisperHttpClient = axios.create({
  baseURL: env.WHISPERAI_URL,
  timeout: 30 * 60 * 1000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  headers: {
    "x-api-key": env.X_API_KEY,
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (error: any): boolean => {
  if (!error) return false;
  if (error.code && ["ECONNABORTED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT"].includes(error.code)) {
    return true;
  }
  const status = error?.response?.status;
  return typeof status === "number" && status >= 500;
};

// Circuit breaker configuration (safe defaults; can be overridden via process.env)
const FAILURE_THRESHOLD = Number.parseInt(process.env.WHISPER_CB_FAILURE_THRESHOLD || "5", 10);
const OPEN_INTERVAL_MS = Number.parseInt(process.env.WHISPER_CB_OPEN_MS || "30000", 10);

// Circuit breaker state
let consecutiveFailures = 0;
let circuitState: "closed" | "open" | "half-open" = "closed";
let nextAttemptAllowedAt = 0;

const onSuccess = () => {
  consecutiveFailures = 0;
  circuitState = "closed";
  nextAttemptAllowedAt = 0;
};

const onFailure = () => {
  consecutiveFailures += 1;
  if (circuitState === "half-open" || consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitState = "open";
    nextAttemptAllowedAt = Date.now() + OPEN_INTERVAL_MS;
  }
};

const DEFAULT_MAX_RETRIES = Number.parseInt(process.env.WHISPER_CB_RETRIES || "3", 10);
const DEFAULT_BASE_BACKOFF_MS = Number.parseInt(
  process.env.WHISPER_CB_BACKOFF_MS || "500",
  10
);

const postWithRetry = async <T = any>(
  url: string,
  data: any,
  config: any,
  retries = DEFAULT_MAX_RETRIES,
  baseBackoffMs = DEFAULT_BASE_BACKOFF_MS
): Promise<T> => {
  const now = Date.now();
  if (circuitState === "open") {
    if (now < nextAttemptAllowedAt) {
      throw new Error(
        `CircuitBreakerOpen: Whisper service temporarily disabled until ${new Date(
          nextAttemptAllowedAt
        ).toISOString()}`
      );
    } else {
      circuitState = "half-open";
    }
  }

  const effectiveRetries = circuitState === "half-open" ? 0 : retries;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await whisperHttpClient.post(url, data, config);
      onSuccess();
      return res.data as T;
    } catch (err: any) {
      attempt += 1;
      if (attempt > effectiveRetries || !shouldRetry(err)) {
        onFailure();
        throw new Error(`Failed to transcribe ${err}`);
      }
      const delay = baseBackoffMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
};

export const transcribe = async (buffer: Buffer, filename = "filename.mp4") => {
  try {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "video/mp4" }), filename);

    return await postWithRetry("/transcribe", form, {
      headers: { Accept: "application/json" },
    });
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

    return await postWithRetry("/transcribe-stream/", buffer, {
      headers: {
        "Content-Type": "video/mp4",
        Accept: "application/json",
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress) {
          const total = progressEvent.total || totalSize;
          const percentCompleted = total
            ? Math.round((progressEvent.loaded * 100) / total)
            : -1;
          onProgress(percentCompleted);
        }
      },
    });
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

      return await postWithRetry("/transcribe", form, {
        headers: { Accept: "application/json" },
        onUploadProgress: (progressEvent: any) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });
    }
  } catch (err) {
    throw new Error(`Failed to transcribe ${err}`);
  }
};
