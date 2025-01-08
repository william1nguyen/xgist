import _ from "lodash";
import logger from "~/infra/logger";
import axios from "axios";
import path from "node:path";
import { env } from "~/env";
import FormData from "form-data";
import { and, eq } from "drizzle-orm";
import { db } from "~/drizzle/db";
import { userLikeVideoTable, userTable, videoTable } from "~/drizzle/schema";
import {
  DeleteVideoParams,
  FileUpload,
  GeminiResponse,
  GetUserVideoParams,
  GetVideoQueryString,
  LikeVideoBody,
  UploadVideoBody,
  Video,
} from "./video.types";
import { UserNotFoundError } from "../user/user.errors";
import {
  VideoContentInvalidError,
  VideoNotFoundError,
  VideoUploadNotFoundError,
} from "./video.errors";
import { v4 as uuidv4 } from "uuid";
import { client, isMinioBucketExisted } from "~/infra/minio";
import { BucketNotFoundError, FileTypeNotAllowedError } from "./video.errors";

enum AllowedMimeTypes {
  mp4 = "video/mp4",
}

const isMimeTypeAllowed = (mimeType: string) => {
  return (Object.values(AllowedMimeTypes) as string[]).includes(mimeType);
};

const truncateFilename = (filename: string, limit: number): string => {
  return filename.slice(0, limit);
};

const uniqueFilename = (originFilename: string) => {
  const extension = path.extname(originFilename);
  const filename = path.basename(originFilename, extension);

  const MAX_FILENAME_LENGTH = 200;
  const truncatedFilename = truncateFilename(filename, MAX_FILENAME_LENGTH);

  return `${truncatedFilename}-${uuidv4()}${extension}`;
};

export const getTranscript = async (fileBuffer: Buffer, fileName: string) => {
  try {
    const formData = new FormData();
    formData.append("files", fileBuffer, {
      filename: fileName,
      contentType: "video/mp4",
    });

    const headers = {
      Accept: "application/json",
      ...formData.getHeaders(),
    };

    const res = await axios.post(`${env.WHISPERAI_URL}/transcribe`, formData, {
      headers,
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
    Use your general knowledge and check if this content is relate to academic or if it provide some source of knowledge:
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

export const uploadFileToMinio = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
) => {
  const bucket = env.MINIO_BUCKET;

  if (!(await isMinioBucketExisted(bucket))) {
    throw new BucketNotFoundError();
  }

  const metaData = {
    "Content-Type": mimeType,
  };

  const minioFilename = uniqueFilename(fileName);

  await client.putObject(
    bucket,
    minioFilename,
    fileBuffer,
    fileBuffer.length,
    metaData
  );
  const url = await client.presignedGetObject(bucket, minioFilename);
  return url;
};

export const handleUploadFile = async (file: FileUpload) => {
  const mimeType = file.mimetype;
  const fileName = file.filename;
  const fileBuffer = await file.toBuffer();

  if (!isMimeTypeAllowed(mimeType)) {
    throw new FileTypeNotAllowedError();
  }

  const transcript = await getTranscript(fileBuffer, fileName);
  const category = (await isVideoContentValid(transcript))
    ? "academic"
    : "entertainment";

  if (category !== "academic") {
    throw new VideoContentInvalidError();
  }

  const url = await uploadFileToMinio(fileBuffer, fileName, mimeType);
  const summary = await getSummary(transcript);

  return {
    url: url,
    transcript,
    summary,
    category,
  };
};

const countLikes = async (video: Video) => {
  const likes = await db.query.userLikeVideoTable.findMany({
    where: eq(userLikeVideoTable.videoId, video.id),
  });
  return likes.length;
};

export const getVideos = async ({
  page = 1,
  limit = 10,
}: GetVideoQueryString) => {
  let videos = (await db.query.videoTable.findMany({
    columns: {
      id: true,
      url: true,
      description: true,
      category: true,
      transcript: true,
      summary: true,
      createdBy: true,
    },
    offset: (page - 1) * limit,
    limit: limit,
  })) as Video[];

  const total = (await db.query.videoTable.findMany()).length;
  for (const video of videos) {
    video.likesCount = await countLikes(video);
  }

  return {
    videos,
    metadata: {
      page: page,
      limit: Math.min(limit, total),
      offset: (page - 1) * limit,
      total,
    },
  };
};

export const getUserVideos = async (
  { page = 1, limit = 10 }: GetVideoQueryString,
  { userId }: GetUserVideoParams
) => {
  const videos = (await db.query.videoTable.findMany({
    columns: {
      id: true,
      url: true,
      description: true,
      category: true,
      transcript: true,
      summary: true,
      createdBy: true,
    },
    offset: (page - 1) * limit,
    limit: limit,
    where: eq(videoTable.createdBy, userId),
  })) as Video[];

  const total = (
    await db.query.videoTable.findMany({
      where: eq(videoTable.createdBy, userId),
    })
  ).length;

  for (const video of videos) {
    video.likesCount = await countLikes(video);
  }

  return {
    videos,
    metadata: {
      page: page,
      limit: Math.min(limit, total),
      offset: (page - 1) * limit,
      total,
    },
  };
};

export const uploadVideo = async (
  {
    file,
    description = {
      value: "description",
    },
    viewable = {
      value: "public",
    },
  }: UploadVideoBody,
  userId: string
) => {
  if (!userId) {
    throw new UserNotFoundError();
  }

  if (!file) {
    throw new VideoUploadNotFoundError();
  }

  const videoData = await handleUploadFile(file);
  const video = await db
    .insert(videoTable)
    .values({
      url: videoData.url,
      description: description.value,
      viewable: viewable.value,
      transcript: videoData.transcript,
      summary: videoData.summary,
      category: videoData.category,
      createdBy: userId,
      updatedBy: userId,
    })
    .onConflictDoNothing()
    .returning();

  return _.first(video);
};

export const deleteVideo = async (
  { videoId }: DeleteVideoParams,
  userId: string
) => {
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.id, userId),
  });

  if (!user) {
    throw new UserNotFoundError();
  }

  const video = await db.query.videoTable.findFirst({
    where: and(eq(videoTable.id, videoId), eq(videoTable.createdBy, userId)),
  });

  if (!video) {
    throw new VideoNotFoundError();
  }

  const res = await db
    .delete(videoTable)
    .where(eq(videoTable.id, videoId))
    .returning();

  return _.first(res);
};

export const likeVideo = async ({ videoId }: LikeVideoBody, userId: string) => {
  const video = await db.query.videoTable.findFirst({
    where: eq(videoTable.id, videoId),
  });

  if (!video) {
    throw new VideoNotFoundError();
  }

  await db
    .insert(userLikeVideoTable)
    .values({
      userId,
      videoId,
    })
    .onConflictDoNothing();

  return video;
};

export const unlikeVideo = async (
  { videoId }: LikeVideoBody,
  userId: string
) => {
  const video = await db.query.videoTable.findFirst({
    where: eq(videoTable.id, videoId),
  });

  if (!video) {
    throw new VideoNotFoundError();
  }

  await db
    .delete(userLikeVideoTable)
    .where(
      and(
        eq(userLikeVideoTable.userId, userId),
        eq(userLikeVideoTable.videoId, videoId)
      )
    );

  return video;
};
