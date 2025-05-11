import { createError } from "~/infra/utils/errors";

enum ErrorCode {
  MediaNotFound = "MediaNotFoundError",
  CreateMediaFailed = "CreateMediaFailedError",
}

export const MediaNotFoundError = createError(
  ErrorCode.MediaNotFound,
  "Media not found",
  404
);

export const CreateMediaFailedError = createError(
  ErrorCode.CreateMediaFailed,
  "Failed to create new media",
  500
);
