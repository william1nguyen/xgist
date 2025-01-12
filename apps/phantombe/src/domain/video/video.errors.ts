import { createError } from "~/infra/utils/errors";

enum ErrorCode {
  FileNotFound = "FileNotFound",
  FileTypeNotAllowed = "FileTypeNotAllowed",
  FileSizeLimitExceed = "FileSizeLimitExceed",
  AudioFileEmpty = "AudioFileEmpty",
  VideoNotFound = "VideoNotFound",
  VideoUploadNotFound = "VideoUploadNotFound",
  VideoContentInvalid = "VideoContentInvalid",
}

export const FileNotFoundError = createError(
  ErrorCode.FileNotFound,
  "Không tìm thấy file để tải lên",
  404,
);

export const FileTypeNotAllowedError = createError(
  ErrorCode.FileTypeNotAllowed,
  "Định dạng File không hợp lệ",
  400,
);

export const FileSizeLimitExceedError = createError(
  ErrorCode.FileSizeLimitExceed,
  "Dung lượng File vượt quá mức cho phép",
  400,
);

export const AudioFileEmptyError = createError(
  ErrorCode.AudioFileEmpty,
  "thư mục âm thanh rỗng",
  400,
);

export const VideoNotFoundError = createError(
  ErrorCode.VideoNotFound,
  "Không tìm thấy video phù hợp",
  404,
);

export const VideoUploadNotFoundError = createError(
  ErrorCode.VideoUploadNotFound,
  "Video chưa được upload",
  404,
);

export const VideoContentInvalidError = createError(
  ErrorCode.VideoContentInvalid,
  "Nội dung video cần liên quan đến học thuật",
  400,
);
