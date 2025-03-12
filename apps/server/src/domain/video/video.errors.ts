import { createError } from "~/infra/utils/errors";

enum ErrorCode {
  FileNotFound = "FileNotFound",
  FileTypeNotAllowed = "FileTypeNotAllowed",
  FileSizeLimitExceed = "FileSizeLimitExceed",
  VideoNotFound = "VideoNotFound",
  VideoInvalid = "VideoInvalid",
  ThumbnailInvalid = "ThumbnailInvalid",
  SummarizeFailed = "SummarizedFailed",
}

export const FileNotFoundError = createError(
  ErrorCode.FileNotFound,
  "Không tìm thấy file để tải lên",
  404
);

export const FileTypeNotAllowedError = createError(
  ErrorCode.FileTypeNotAllowed,
  "Định dạng File không hợp lệ",
  500
);

export const FileSizeLimitExceedError = createError(
  ErrorCode.FileSizeLimitExceed,
  "Dung lượng File vượt quá mức cho phép",
  500
);

export const VideoNotFoundError = createError(
  ErrorCode.VideoNotFound,
  "Không tìm thấy video phù hợp",
  404
);

export const VideoInvalidError = createError(
  ErrorCode.VideoInvalid,
  "Video không phù hợp",
  500
);

export const ThumbnailInvalidError = createError(
  ErrorCode.ThumbnailInvalid,
  "Ảnh thumbnail không phù hợp",
  500
);

export const SummarizedFailedError = createError(
  ErrorCode.SummarizeFailed,
  "Lỗi khi tóm tắt video",
  500
);
