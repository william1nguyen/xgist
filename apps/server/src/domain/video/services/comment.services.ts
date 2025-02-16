import { count, eq, and } from "drizzle-orm";
import { db } from "~/drizzle/db";
import { commentTable } from "~/drizzle/schema/comment";
import { videoTable } from "~/drizzle/schema/video";
import logger from "~/infra/logger";
import type { GetQueryString } from "~/infra/utils/schema";
import { CommentInvalidError, VideoNotFoundError } from "../video.errors";
import type { CreateCommentBody, GetCommentsParams } from "../video.types";
import { userTable } from "~/drizzle/schema/user";

export const createCommentVideo = async (
  { videoId, content }: CreateCommentBody,
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

  if (!content) {
    throw new CommentInvalidError();
  }

  try {
    const comments = await db
      .insert(commentTable)
      .values({
        videoId,
        content,
        userId,
      })
      .onConflictDoUpdate({
        target: [commentTable.id],
        set: {
          content,
        },
      })
      .returning({
        id: commentTable.id,
      });

    const commentWithUsers = await db
      .select({
        id: commentTable.id,
        content: commentTable.content,
        videoId: commentTable.videoId,
        userId: commentTable.userId,
        createdTime: commentTable.createdTime,
        user: {
          id: userTable.id,
          keycloakUserId: userTable.keycloakUserId,
          username: userTable.username,
          email: userTable.email,
        },
      })
      .from(commentTable)
      .innerJoin(userTable, eq(commentTable.userId, userTable.id))
      .where(
        and(
          eq(commentTable.id, comments[0].id),
          eq(commentTable.userId, userId)
        )
      );
    return {
      data: {
        comment: commentWithUsers[0],
      },
    };
  } catch (error) {
    logger.error(`Failed to comment video : ${error}`);
  }
};

export const getVideoComments = async (
  { page = 1, size = 10 }: GetQueryString,
  { videoId }: GetCommentsParams
) => {
  if (!videoId) {
    throw new VideoNotFoundError();
  }

  const offset = (page - 1) * size;

  const videos = await db
    .select()
    .from(videoTable)
    .where(eq(videoTable.id, videoId));

  if (!videos) {
    throw new VideoNotFoundError();
  }

  const comments = await db
    .select({
      id: commentTable.id,
      content: commentTable.content,
      videoId: commentTable.videoId,
      userId: commentTable.userId,
      createdTime: commentTable.createdTime,
      user: {
        id: userTable.id,
        keycloakUserId: userTable.keycloakUserId,
        username: userTable.username,
        email: userTable.email,
      },
    })
    .from(commentTable)
    .innerJoin(userTable, eq(commentTable.userId, userTable.id))
    .where(eq(commentTable.videoId, videoId))
    .limit(size)
    .offset(offset);

  const total = (
    await db
      .select({ count: count() })
      .from(commentTable)
      .where(eq(commentTable.videoId, videoId))
  )[0].count;

  return {
    data: {
      comments,
    },
    metadata: {
      page,
      size,
      total,
    },
  };
};
