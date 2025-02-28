import path from "node:path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { FileTypeNotAllowedError } from "~/domain/video/video.errors";
import { env } from "~/env";
import { minioClient } from "~/infra/minio";

interface ExtendedFile extends File {
  mimetype: string;
  filename: string;
  toBuffer(): Promise<Buffer>;
}

const extractFileInfo = (file: ExtendedFile) => {
  const mimeType = file.mimetype;
  const fileName = file.filename;
  return {
    mimeType,
    fileName,
  };
};

const validateFileType = (
  mimeType: string,
  type?: "image" | "video" | "audio"
) => {
  return type ? mimeType.startsWith(type) : true;
};

const generateMinioFileName = (fileName: string, folder?: string) => {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const name = `${base.slice(0, 200)}-${uuidv4()}${ext}`;
  return path.join(folder || "", name);
};

const getMinioFileUrl = (bucket: string, fileName: string) => {
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
  }
};

export interface UploaderOptions {
  bucket: string;
  allowedType: "image" | "video" | "audio";
  shouldCompress?: boolean;
}

export interface UploadOptions extends UploaderOptions {
  file: ExtendedFile;
  folder?: string;
}

export const upload = async ({
  bucket,
  folder,
  file,
  allowedType,
  shouldCompress,
}: UploadOptions) => {
  const { mimeType, fileName } = extractFileInfo(file);
  let buffer = await file.toBuffer();

  if (allowedType && !validateFileType(mimeType, allowedType)) {
    throw new FileTypeNotAllowedError();
  }

  if (shouldCompress && validateFileType(mimeType, "image")) {
    const compressedBuffer = await compress(buffer);

    if (compressedBuffer) {
      buffer = compressedBuffer;
    }
  }

  const metaData = {
    "Content-Type": mimeType,
  };

  const minioFilename = generateMinioFileName(fileName, folder);

  await minioClient.putObject(
    bucket,
    minioFilename,
    buffer,
    buffer.length,
    metaData
  );

  const url = getMinioFileUrl(bucket, minioFilename);

  return {
    url,
    fileName,
    mimeType,
    size: buffer.length,
  };
};

export const createUploader = (options: UploaderOptions) => {
  return async (file: ExtendedFile, folder?: string) => {
    return upload({ ...options, file, folder });
  };
};
