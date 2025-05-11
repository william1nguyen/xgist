import { createError } from "~/infra/utils/errors";

enum ErrorCode {
  BucketNotFound = "BucketNotFoundError",
  DestLocationNotFound = "DestLocationNotFoundError",
  FileNotFound = "FileNotFoundError",
  FileTypeNotAllowed = "FileTypeNotAllowedError",
  FileTypeCompressionNotSupported = "FileTypeCompressionNotSupportedError",
  FileSizeLimitExceed = "FileSizeLimitExceedError",
}

export const BucketNotFoundError = createError(
  ErrorCode.BucketNotFound,
  "Bucket not found!",
  404
);

export const MinioDestLocationNotFoundError = createError(
  ErrorCode.DestLocationNotFound,
  "Minio folder not found!",
  404
);

export const FileNotFoundError = createError(
  ErrorCode.FileNotFound,
  "File uploaded not found",
  404
);

export const FileTypeNotAllowedError = createError(
  ErrorCode.FileTypeNotAllowed,
  "Invalid file type",
  500
);

export const FileTypeCompressionNotSupportedError = createError(
  ErrorCode.FileTypeCompressionNotSupported,
  "Compressing Image is not supported for this type!",
  500
);

export const FileSizeLimitExceedError = createError(
  ErrorCode.FileSizeLimitExceed,
  "File is too big!",
  500
);
