import { and, count, eq, sql } from "drizzle-orm";
import _ from "lodash";
import { db } from "~/drizzle/db";
import {
  bookmarkTable,
  videoLikeTable,
  videoTable,
} from "~/drizzle/schema/video";
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
  GetVideoDetailParams,
  UploadVideoBody,
} from "./video.types";
import { createUploader } from "~/infra/utils/upload";
import { summaryQueue } from "~/infra/jobs/workers/summarize";
import { Buffer } from "buffer";
import axios from "axios";
import { env } from "~/env";
import FormData from "form-data";
import { prompting } from "~/infra/gemini";

const uploadThumbnail = createUploader({
  bucket: "thumbnail",
  allowedType: "image",
  shouldCompress: true,
});

const uploadVideo = createUploader({
  bucket: "videos",
  allowedType: "video",
});

export const getVideos = async (
  { page = 1, size = 100 }: GetQueryString,
  userId?: string
) => {
  try {
    const offset = (page - 1) * size;
    const queryOptions: any = {
      with: {
        creator: true,
      },
      limit: size,
      offset,
    };

    if (userId) {
      queryOptions.with.isLiked = {
        where: eq(videoLikeTable.userId, userId),
        columns: {
          state: true,
        },
      };

      queryOptions.with.isBookmarked = {
        where: eq(bookmarkTable.userId, userId),
        columns: {
          state: true,
        },
      };
    }

    const videos = await db.query.videoTable.findMany(queryOptions);
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

export const getVideoDetail = async (
  { videoId }: GetVideoDetailParams,
  userId?: string
) => {
  try {
    const queryOptions: any = {
      where: eq(videoTable.id, videoId),
      with: {
        creator: true,
      },
    };

    if (userId) {
      queryOptions.with.isLiked = {
        where: eq(videoLikeTable.userId, userId),
        columns: {
          state: true,
        },
      };

      queryOptions.with.isBookmarked = {
        where: eq(bookmarkTable.userId, userId),
        columns: {
          state: true,
        },
      };
    }
    const video = await db.query.videoTable.findFirst(queryOptions);
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

  const like = await db.query.videoLikeTable.findFirst({
    where: and(
      eq(videoLikeTable.videoId, videoId),
      eq(videoLikeTable.userId, userId)
    ),
  });

  if (!like) {
    const res = await db
      .insert(videoLikeTable)
      .values({
        videoId,
        userId,
        state: true,
      })
      .returning();
    return res;
  }

  const state = !like.state;
  const res = await db
    .update(videoLikeTable)
    .set({
      state,
    })
    .where(
      and(
        eq(videoLikeTable.videoId, videoId),
        eq(videoLikeTable.userId, userId)
      )
    )
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

  const bookmark = await db.query.bookmarkTable.findFirst({
    where: and(
      eq(bookmarkTable.videoId, videoId),
      eq(bookmarkTable.userId, userId)
    ),
  });

  if (!bookmark) {
    const res = await db
      .insert(bookmarkTable)
      .values({
        videoId,
        userId,
        state: true,
      })
      .returning();
    return res;
  }

  const state = !bookmark.state;
  const res = await db
    .update(bookmarkTable)
    .set({
      state,
    })
    .where(
      and(eq(bookmarkTable.videoId, videoId), eq(bookmarkTable.userId, userId))
    )
    .returning();
  return res;
};

export const getBookmarkedVideos = async (
  { page = 1, size = 20 }: GetQueryString,
  userId: string
) => {
  const offset = (page - 1) * size;
  const videos = await db.query.bookmarkTable.findMany({
    with: {
      video: true,
    },
    where: and(eq(bookmarkTable.userId, userId), eq(bookmarkTable.state, true)),
    limit: size,
    offset,
  });

  if (!videos) {
    throw new VideoNotFoundError();
  }

  const total = (await db.select({ count: count() }).from(videoTable))[0].count;

  return {
    data: {
      videos,
    },
    metadata: {
      page,
      size,
      total,
    },
  };
};

export const transcribe = async (buffer: Buffer, name: string) => {
  try {
    const form = new FormData();

    form.append("files", buffer, {
      filename: name,
      contentType: "video/mp4",
      knownLength: buffer.length,
    });

    const res = await axios.post(`${env.WHISPERAI_URL}`, form, {
      headers: {
        ...form.getHeaders(),
        Accept: "application/json",
      },
    });
    const data = res.data;

    return data.transcriptions[name];
  } catch (err) {
    logger.error(`Failed to transcribe: ${err}`);
  }
};

export const summarize = async (transcript: string) => {
  const res = await prompting("");
  return res;
};

export const estimateReadTime = async (transcript: string) => {
  const res = await prompting("");
  return res;
};

export const extractMainIdeas = async (transcript: string) => {
  const res = await prompting("");
  return res;
};

export const extractKeyWords = async (transcript: string) => {
  const res = await prompting("");
  return res;
};
