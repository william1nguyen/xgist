import { Client, type ClientOptions } from "minio";
import { env } from "~/env";
import logger from "./logger";
import { createError } from "./utils/errors";

export const UploadFileToMinioError = createError(
  "UploadFileToMinioError",
  "Failed to upload file to Minio",
  500
);

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
  port: env.MINIO_PORT ? Number(env.MINIO_PORT) : undefined,
});

export const isMinioBucketExisted = async (bucket: string) => {
  if (!bucket) return false;
  const existed = await minioClient.bucketExists(bucket);
  return existed;
};

export const uploadFileToMinio = async (
  bucketName: string,
  objectName: string,
  mimeType: string,
  fileBuffer: Buffer
) => {
  try {
    await minioClient.putObject(
      bucketName,
      objectName,
      fileBuffer,
      fileBuffer.length,
      {
        "Content-Type": mimeType,
      }
    );
    const httpProtocol = env.NODE_ENV === "production" ? "https" : "http";
    const endpoint = env.MINIO_PORT
      ? `${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`
      : `${env.MINIO_ENDPOINT}`;
    const url = `${httpProtocol}://${endpoint}/${bucketName}/${objectName}`;
    return url;
  } catch (error) {
    logger.error(`Failed to upload file to MinIO: ${error}`);
    throw new UploadFileToMinioError();
  }
};
