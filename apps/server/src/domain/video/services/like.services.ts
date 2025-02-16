import { and, eq } from "drizzle-orm";
import { db } from "~/drizzle/db";
import { likeTable } from "~/drizzle/schema/like";
import { videoTable } from "~/drizzle/schema/video";
import logger from "~/infra/logger";
import { VideoNotFoundError } from "../video.errors";
import type {
  CheckIsLikedParams,
  LikeVideoParams,
  UnlikeVideoParams,
} from "../video.types";

export const likeVideo = async (
  { videoId }: LikeVideoParams,
  userId: string
) => {
  if (!videoId) {
    throw new VideoNotFoundError();
  }

  const videos = await db
    .select()
    .from(videoTable)
    .where(eq(videoTable.id, videoId));

  if (!videos) {
    throw new VideoNotFoundError();
  }

  try {
    const likes = await db
      .insert(likeTable)
      .values({
        videoId,
        userId,
      })
      .returning();
    return {
      data: {
        like: likes[0],
      },
    };
  } catch (error) {
    logger.error(`Failed to like video: ${error}`);
  }
};

export const unlikeVideo = async (
  { videoId }: UnlikeVideoParams,
  userId: string
) => {
  if (!videoId) {
    throw new VideoNotFoundError();
  }

  const videos = await db
    .select()
    .from(videoTable)
    .where(eq(videoTable.id, videoId));

  if (!videos) {
    throw new VideoNotFoundError();
  }

  try {
    const likes = await db
      .delete(likeTable)
      .where(and(eq(likeTable.videoId, videoId), eq(likeTable.userId, userId)))
      .returning();
    return {
      data: {
        like: likes[0],
      },
    };
  } catch (error) {
    logger.error(`Failed to unlike video: ${error}`);
  }
};

export const checkIsLiked = async (
  { videoId }: CheckIsLikedParams,
  userId: string
) => {
  if (!videoId) {
    throw new VideoNotFoundError();
  }

  const videos = await db
    .select()
    .from(videoTable)
    .where(eq(videoTable.id, videoId));

  if (!videos) {
    throw new VideoNotFoundError();
  }

  const isLikedList = await db
    .select()
    .from(likeTable)
    .where(and(eq(likeTable.userId, userId), eq(likeTable.videoId, videoId)));

  return {
    isLiked: !isLikedList.length ? false : true,
  };
};
