import { and, count, eq, like } from "drizzle-orm";
import _ from "lodash";
import { db } from "~/drizzle/db";
import { bookmarkTable, likeTable, videoTable } from "~/drizzle/schema/video";
import logger from "~/infra/logger";
import { itemResponse } from "~/infra/utils/fns";
import type { GetQueryString } from "~/infra/utils/schema";
import {
  ThumbnailInvalidError,
  VideoInvalidError,
  VideoNotFoundError,
} from "./video.errors";
import {
  GetRelatedVideosParams,
  ToggleBookmarkParams,
  ToggleLikeParams,
  type GetVideoDetailParams,
  type UploadVideoBody,
} from "./video.types";
import { createUploader } from "~/infra/utils/upload";
import { summaryQueue } from "~/infra/jobs/workers/summarize";

const uploadThumbnail = createUploader({
  bucket: "thumbnail",
  allowedType: "image",
  shouldCompress: true,
});

const uploadVideo = createUploader({
  bucket: "videos",
  allowedType: "video",
});

export const getVideos = async ({ page = 1, size = 100 }: GetQueryString) => {
  try {
    const offset = (page - 1) * size;
    const videos = await db.query.videoTable.findMany({
      with: {
        creator: true,
      },
      limit: size,
      offset,
    });
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
    const video = await db.query.videoTable.findFirst({
      where: eq(videoTable.id, videoId),
      with: {
        creator: true,
      },
    });

    return itemResponse({ video });
  } catch (error) {
    logger.error(`Failed to get video ${videoId}: ${error}`);
    throw new VideoNotFoundError();
  }
};

export const getRelatedVideos = async ({
  page = 1,
  size = 20,
}: GetRelatedVideosParams) => {
  const offset = (page - 1) * size;
  const videos = await db.query.videoTable.findMany({
    with: {
      creator: true,
    },
    limit: size,
    offset,
  });
  const total = (await db.select({ count: count() }).from(videoTable))[0].count;
  return {
    data: { videos },
    metadata: {
      page,
      size,
      total,
    },
  };
};

export const postVideo = async (
  { videoFile, thumbnailFile, title, description, category }: UploadVideoBody,
  userId: string
) => {
  if (!videoFile) {
    throw new VideoInvalidError();
  }

  if (!thumbnailFile) {
    throw new ThumbnailInvalidError();
  }

  const thumbnail = await uploadThumbnail(thumbnailFile);
  const video = await uploadVideo(videoFile);

  await summaryQueue.add("summary", video);

  const res = (
    await db
      .insert(videoTable)
      .values({
        title: title.value,
        description: description.value,
        url: video.url,
        thumbnail: thumbnail.url,
        category: category.value,
        userId,
        isSummarized: false,
      })
      .returning()
  )[0];

  return res;
};

export const toggleLike = async (
  { videoId }: ToggleLikeParams,
  userId: string
) => {
  const video = await db.query.videoTable.findFirst({
    where: eq(videoTable.id, videoId),
  });

  if (!video) {
    throw new VideoNotFoundError();
  }

  const UNLIKE = -1;
  const LIKE = 1;

  const likeDelta = (await db.query.likeTable.findFirst({
    where: and(eq(likeTable.videoId, videoId), eq(likeTable.userId, userId)),
  }))
    ? UNLIKE
    : LIKE;

  const res = await db
    .update(videoTable)
    .set({
      likes: video.likes + likeDelta,
    })
    .returning();

  return res;
};

export const toggleBookmark = async (
  { videoId }: ToggleBookmarkParams,
  userId: string
) => {
  const video = await db.query.videoTable.findFirst({
    where: eq(videoTable.id, videoId),
  });

  if (!video) {
    throw new VideoNotFoundError();
  }

  const UNBOOKMARK = false;
  const BOOKMARK = true;

  const bookmark = (await db.query.likeTable.findFirst({
    where: and(eq(likeTable.videoId, videoId), eq(likeTable.userId, userId)),
  }))
    ? UNBOOKMARK
    : BOOKMARK;

  const res = await db
    .update(bookmarkTable)
    .set({
      state: bookmark,
    })
    .returning();

  return res;
};
