import { createError } from "~/infra/utils/errors";

enum ErrorCode {
  TranscriptFound = "TranscriptFoundError",
}

export const TranscriptFoundError = createError(
  ErrorCode.TranscriptFound,
  "Transcript not found",
  404
);
