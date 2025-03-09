import { and, count, eq, not } from "drizzle-orm";
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
  GetRelatedVideosQuerystring,
  ToggleBookmarkParams,
  ToggleLikeParams,
  GetVideoDetailParams,
  UploadVideoBody,
  SummarizeVideoBody,
  GetRelatedVideosParams,
} from "./video.types";
import { createUploader } from "~/infra/utils/upload";
import { summaryQueue } from "~/infra/jobs/workers/summarize";
import { prompting } from "~/infra/gemini";
import { transcribe } from "~/infra/whisper";
import { getVideoDurationInSeconds } from "get-video-duration";

const uploadThumbnail = createUploader({
  bucket: "thumbnails",
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

export const getRelatedVideos = async (
  { videoId }: GetRelatedVideosParams,
  { page = 1, size = 10, category }: GetRelatedVideosQuerystring
) => {
  const offset = (page - 1) * size;
  const videos = await db.query.videoTable.findMany({
    where: and(
      eq(videoTable.category, category),
      not(eq(videoTable.id, videoId))
    ),
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
  const duration = Math.round(
    (await getVideoDurationInSeconds(video.url)) * 1000
  );

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
        duration,
      })
      .returning()
  )[0];

  const videoBuffer = videoFile._buf;
  const encodedData = Buffer.from(videoBuffer).toString("base64");

  await summaryQueue.add("summary", {
    ...video,
    videoId: res.id,
    encodedData,
  });

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

export const summarize = async (text: string) => {
  const prompt = `
    Summarize the following transcript concisely while preserving the key points and main message:
    ${text}
  `;

  const res = await prompting(prompt);
  return res;
};

export const extractMainIdeas = async (text: string): Promise<string[]> => {
  const prompt = `
    Extract the 3-5 main ideas from the following transcript.
    
    Transcript:
    ${text}
    
    Respond with a list of the main ideas only, one per line, with no numbering or bullet points.
    Each main idea should be a concise statement.
  `;

  const res = await prompting(prompt);

  return res
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
};

export const extractKeyWords = async (text: string): Promise<string[]> => {
  const prompt = `
    Extract the 10 most significant keywords or key phrases from the following transcript.
    Transcript:
    ${text}
    Respond with a list of keywords or key phrases only, one per line, with no numbering or bullet points.
  `;

  const res = await prompting(prompt);

  return res
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
};

export const summarizeBuffer = async (buffer: Buffer) => {
  const transcripts = await transcribe(buffer);
  const { text } = transcripts;

  const [summary, keyPoints, keywords] = await Promise.all([
    summarize(text),
    extractMainIdeas(text),
    extractKeyWords(text),
  ]);

  return {
    summary,
    keyPoints,
    keywords,
    transcripts,
  };
};

export const summarizeVideo = async ({ videoFile }: SummarizeVideoBody) => {
  if (!videoFile) {
    throw new VideoInvalidError();
  }

  const buffer = videoFile._buf;
  const res = await summarizeBuffer(buffer);
  return res;
};
