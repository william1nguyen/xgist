import { createError } from "~/infra/utils/errors";

enum ErrorCode {
  VideoInvalid = "VideoInvalid",
  SummarizeFailed = "SummarizedFailed",
}

export const VideoInvalidError = createError(
  ErrorCode.VideoInvalid,
  "Video không phù hợp",
  500
);

export const SummarizedFailedError = createError(
  ErrorCode.SummarizeFailed,
  "Lỗi khi tóm tắt video",
  500
);
