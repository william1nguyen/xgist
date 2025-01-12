import { Client, type ClientOptions } from "minio";
import { env } from "~/env";

const minioConfig: ClientOptions = {
  endPoint: env.MINIO_ENDPOINT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
};

if (env.MINIO_PORT) {
  minioConfig.port = Number(env.MINIO_PORT);
}

export const client = new Client(minioConfig);

export const isMinioBucketExisted = async (bucket: string) => {
  if (!bucket) {
    return false;
  }

  const existed = await client.bucketExists(bucket);
  return existed;
};

export const uploadVideo = async (
  file: Buffer,
  path: string
): Promise<void> => {
  await client.putObject("videos", path, file);
};

export const getVideoStreamUrl = async (
  videoId: string,
  resolution: string
): Promise<string> => {
  return client.presignedGetObject("videos", `${videoId}/${resolution}`);
};
