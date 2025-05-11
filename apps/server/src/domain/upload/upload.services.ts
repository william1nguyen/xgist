import path from "node:path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { env } from "~/env";
import { minioClient } from "~/infra/minio";
import {
  FileTypeCompressionNotSupportedError,
  FileTypeNotAllowedError,
} from "./upload.errors";
import type { File } from "./upload.types";

export interface FileBuffer {
  mimetype: string;
  filename: string;
  buffer: Buffer;
}

const extractFileInfo = (file: File | FileBuffer) => {
  const mimeType = file.mimetype as string;
  const fileName = file.filename as string;
  return {
    mimeType,
    fileName,
  };
};

const validateFileType = (
  mimeType: string,
  types?: ("image" | "video" | "audio" | "pdf")[]
) => {
  return types ? types.some((type) => mimeType.includes(type)) : true;
};

export const generateMinioFileName = (fileName: string, folder?: string) => {
  const formattedFileName = fileName.replaceAll(/\s/g, "");
  const ext = path.extname(formattedFileName);
  const base = path.basename(formattedFileName, ext);
  const name = `${base.slice(0, 200)}-${uuidv4()}${ext}`;
  return path.join(folder || "", name);
};

export const getMinioFileUrl = (bucket: string, fileName: string) => {
  const protocol = env.MINIO_USE_SSL ? "https" : "http";
  const endpoint = env.MINIO_PORT
    ? `${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`
    : `${env.MINIO_ENDPOINT}`;
  const url = `${protocol}://${endpoint}/${bucket}/${fileName}`;
  return url;
};

const compress = async (fileBuffer: Buffer) => {
  const image = sharp(fileBuffer);
  const meta = await image.metadata();
  const { format } = meta;

  switch (format) {
    case "jpeg":
      return image
        .jpeg({ mozjpeg: true })
        .resize({
          fit: sharp.fit.contain,
          width: 1080,
          withoutEnlargement: true,
        })
        .toBuffer();
    case "png":
      return image
        .png({ compressionLevel: 9, effort: 10, adaptiveFiltering: true })
        .resize({
          fit: sharp.fit.contain,
          width: 1080,
          withoutEnlargement: true,
        })
        .toBuffer();
    case "webp":
      return image
        .webp()
        .resize({
          fit: sharp.fit.contain,
          width: 1080,
          withoutEnlargement: true,
        })
        .toBuffer();
    default:
      throw new FileTypeCompressionNotSupportedError();
  }
};

export interface UploaderOptions {
  bucket: string;
  allowedTypes: ("image" | "video" | "audio" | "pdf")[];
  shouldCompress?: boolean;
}

export interface UploadOptions extends UploaderOptions {
  file: File | FileBuffer;
  folder?: string;
  uniqueName?: boolean;
}

export const upload = async ({
  bucket,
  folder,
  file,
  allowedTypes,
  uniqueName = true,
  shouldCompress,
}: UploadOptions) => {
  const { mimeType, fileName } = extractFileInfo(file);
  let fileBuffer = file.buffer ? file.buffer : await file.toBuffer();

  if (allowedTypes && !validateFileType(mimeType, allowedTypes)) {
    throw new FileTypeNotAllowedError();
  }

  if (shouldCompress && validateFileType(mimeType, ["image"])) {
    fileBuffer = await compress(fileBuffer);
  }

  const metaData = {
    "Content-Type": mimeType,
  };

  const minioFilename = uniqueName
    ? generateMinioFileName(fileName, folder)
    : path.join(folder || "", fileName);

  await minioClient.putObject(
    bucket,
    minioFilename,
    fileBuffer,
    fileBuffer.length,
    metaData
  );

  const url = getMinioFileUrl(bucket, minioFilename);

  return {
    url,
    fileName,
    mimeType,
    size: fileBuffer.length,
  };
};

export const createUploader = (options: UploaderOptions) => {
  return async (file: File, folder?: string, uniqueName?: boolean) => {
    return upload({ ...options, file, uniqueName, folder });
  };
};

export const uploadImage = createUploader({
  bucket: "images",
  allowedTypes: ["image"],
});

export const uploadVideo = createUploader({
  bucket: "videos",
  allowedTypes: ["video"],
});

export const uploadAudio = createUploader({
  bucket: "audios",
  allowedTypes: ["audio"],
});
