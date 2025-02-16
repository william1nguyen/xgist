import { count, eq, sql } from "drizzle-orm";
import _ from "lodash";
import { db } from "~/drizzle/db";
import { commentTable } from "~/drizzle/schema/comment";
import { likeTable } from "~/drizzle/schema/like";
import { userTable } from "~/drizzle/schema/user";
import { videoTable } from "~/drizzle/schema/video";
import { uploadQueue } from "~/infra/jobs/workers/upload.worker";
import logger from "~/infra/logger";
import { uploadFileToMinio } from "~/infra/minio";
import { itemResponse } from "~/infra/utils/fns";
import type { GetQueryString } from "~/infra/utils/schema";
import { VideoNotFoundError, VideoUploadNotFoundError } from "../video.errors";
import type { GetVideoDetailParams, UploadVideoBody } from "../video.types";

export const uploadVideo = async (
  { file, thumbnail, title, description }: UploadVideoBody,
  userId: string
) => {
  if (!file) {
    throw new VideoUploadNotFoundError();
  }

  let thumbnailUrl = null;

  if (thumbnail) {
    const mimeType = thumbnail.mimetype;
    const fileName = thumbnail.filename;
    const fileBuffer = (await thumbnail.toBuffer()) as Buffer;
    thumbnailUrl = await uploadFileToMinio(
      "thumbnails",
      fileName,
      mimeType,
      fileBuffer
    );
  }

  const mimeType = file.mimetype;
  const fileName = file.filename;
  const fileBuffer = (await file.toBuffer()) as Buffer;
  const encodedData = Buffer.from(fileBuffer).toString("base64");

  await uploadQueue.add("upload", {
    title: title.value,
    description: description.value,
    thumbnailUrl,
    mimeType,
    fileName,
    encodedData,
    userId,
  });

  return {
    msg: "acknowledged",
  };
};

export const getVideos = async ({ page = 1, size = 100 }: GetQueryString) => {
  try {
    const offset = (page - 1) * size;
    const videos = await db
      .select({
        id: videoTable.id,
        title: videoTable.title,
        description: videoTable.description,
        url: videoTable.url,
        thumbnailUrl: videoTable.thumbnailUrl,
        userId: videoTable.userId,
        createdTime: videoTable.createdTime,
        user: {
          id: userTable.id,
          keycloakUserId: userTable.keycloakUserId,
          username: userTable.username,
          email: userTable.email,
        },
        _count: {
          likes: sql<number>`(SELECT COUNT(*) FROM ${likeTable} WHERE ${likeTable.videoId} = ${videoTable.id})`,
          comments: sql<number>`(SELECT COUNT(*) FROM ${commentTable} WHERE ${commentTable.videoId} = ${videoTable.id})`,
        },
      })
      .from(videoTable)
      .innerJoin(userTable, eq(videoTable.userId, userTable.id))
      .limit(size)
      .offset(offset);
    const total = (await db.select({ count: count() }).from(videoTable))[0]
      .count;
    return {
      data: { videos },
      metadata: {
        page,
        size,
        total,
      },
    };
  } catch (error) {
    logger.error(`Failed to get videos: ${error}`);
    throw new VideoNotFoundError();
  }
};

export const getVideoDetail = async ({ videoId }: GetVideoDetailParams) => {
  try {
    const videos = await db
      .select({
        id: videoTable.id,
        title: videoTable.title,
        description: videoTable.description,
        url: videoTable.url,
        thumbnailUrl: videoTable.thumbnailUrl,
        userId: videoTable.userId,
        createdTime: videoTable.createdTime,
        user: {
          id: userTable.id,
          keycloakUserId: userTable.keycloakUserId,
          username: userTable.username,
          email: userTable.email,
        },
        _count: {
          likes: sql<number>`(SELECT COUNT(*) FROM ${likeTable} WHERE ${likeTable.videoId} = ${videoTable.id})`,
          comments: sql<number>`(SELECT COUNT(*) FROM ${commentTable} WHERE ${commentTable.videoId} = ${videoTable.id})`,
        },
      })
      .from(videoTable)
      .innerJoin(userTable, eq(videoTable.userId, userTable.id))
      .where(eq(videoTable.id, videoId));

    return itemResponse({ video: videos[0] });
  } catch (error) {
    logger.error(`Failed to get video ${videoId}: ${error}`);
    throw new VideoNotFoundError();
  }
};
