import { db } from "~/drizzle/db";
import { videoTable } from "~/drizzle/schema/video";
import { uploadFileToMinio } from "~/infra/minio";
import { FileTypeNotAllowedError } from "../../video.errors";

enum AllowedMimeTypes {
  mp4 = "video/mp4",
}

const isMimeTypeAllowed = (mimeType: string) => {
  return (Object.values(AllowedMimeTypes) as string[]).includes(mimeType);
};

export const handleUploadVideo = async (
  title: string,
  description: string,
  thumbnailUrl: string | null,
  mimeType: string,
  fileName: string,
  fileBuffer: Buffer,
  userId: string
) => {
  if (!isMimeTypeAllowed(mimeType)) {
    throw new FileTypeNotAllowedError();
  }

  const url = await uploadFileToMinio("videos", fileName, mimeType, fileBuffer);
  const videos = await db
    .insert(videoTable)
    .values({
      title,
      description,
      thumbnailUrl,
      url,
      userId,
    })
    .returning();
  return videos[0];
};
