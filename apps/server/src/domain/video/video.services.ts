import _ from "lodash";
import logger from "~/infra/logger";
import axios from "axios";
import { env } from "~/env";
import FormData from "form-data";
import {
  CreateCommentBody,
  GeminiResponse,
  GetCommentsParams,
  GetVideoDetailParams,
  ToggleLikeVideoBody,
  UploadVideoBody,
} from "./video.types";
import {
  CommentInvalidError,
  FileTypeNotAllowedError,
  VideoContentInvalidError,
  VideoNotFoundError,
  VideoUploadNotFoundError,
} from "./video.errors";
import { uploadQueue } from "~/infra/jobs/workers/upload.worker";
import { uploadFileToMinio } from "~/infra/minio";
import { db } from "~/drizzle/db";
import { commentTable } from "~/drizzle/schema/comment";
import { itemResponse } from "~/infra/utils/fns";
import { GetQueryString } from "~/infra/utils/schema";
import { videoTable } from "~/drizzle/schema/video";
import { and, count, eq } from "drizzle-orm";
import { likeTable } from "~/drizzle/schema/like";

enum AllowedMimeTypes {
  mp4 = "video/mp4",
}

const isMimeTypeAllowed = (mimeType: string) => {
  return (Object.values(AllowedMimeTypes) as string[]).includes(mimeType);
};

export const getTranscript = async (fileBuffer: Buffer, fileName: string) => {
  try {
    const form = new FormData();

    form.append("files", fileBuffer, {
      filename: fileName,
      contentType: "video/mp4",
      knownLength: fileBuffer.length,
    });

    const res = await axios.post(`${env.WHISPERAI_URL}/transcribe`, form, {
      headers: {
        ...form.getHeaders(),
        Accept: "application/json",
      },
    });
    const data = res.data;

    return data.transcriptions[fileName];
  } catch (err) {
    logger.error(`Failed to get transcript ${err}`);
    return null;
  }
};

export const isVideoContentValid = async (content: string) => {
  if (!content) return false;

  try {
    const url = `${env.GEMINI_FLASH_URL}?key=${env.GOOGLE_API_KEY}`;
    const headers = {
      "Content-Type": "application/json",
    };
    const prompt = `
    Use your general knowledge and check if this content is academically related or it provides some source of knowledge, experience or stories:
      ${content}
    Rule:
      - Only return boolean: true or false
  `;
    const res = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      { headers }
    );
    const data = res.data as GeminiResponse;
    const isAcademic = JSON.parse(
      _.first(_.first(data.candidates)?.content.parts)?.text as string
    );
    return isAcademic;
  } catch (err) {
    logger.error(err);
    return false;
  }
};

export const getSummary = async (transcript: string) => {
  const url = `${env.GEMINI_FLASH_URL}?key=${env.GOOGLE_API_KEY}`;
  const headers = {
    "Content-Type": "application/json",
  };
  const prompt = `Use your general knowledge and give me short description/summary for: ${transcript}`;
  const res = await axios.post(
    url,
    {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    },
    { headers }
  );
  const data = res.data as GeminiResponse;
  const summary = _.first(_.first(data.candidates)?.content.parts)
    ?.text as string;
  return summary;
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

  console.log(videos);

  return videos[0];
};

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

export const getVideos = async ({ page = 1, size = 10 }: GetQueryString) => {
  try {
    const offset = (page - 1) * size;
    const videos = await db
      .select()
      .from(videoTable)
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
      .select()
      .from(videoTable)
      .where(eq(videoTable.id, videoId));

    return itemResponse({ video: videos[0] });
  } catch (error) {
    logger.error(`Failed to get video ${videoId}: ${error}`);
    throw new VideoNotFoundError();
  }
};

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
      .returning();
    return {
      data: {
        comment: comments[0],
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
    .select()
    .from(commentTable)
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

export const toggleLikeVideo = async (
  { videoId }: ToggleLikeVideoBody,
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
    const likes = await db
      .delete(likeTable)
      .where(and(eq(likeTable.videoId, videoId), eq(likeTable.userId, userId)))
      .returning();
    return {
      data: {
        like: likes[0],
      },
    };
  }
};
