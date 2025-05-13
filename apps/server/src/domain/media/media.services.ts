import { db } from "~/drizzle/db";
import {
  CreateMediaBody,
  DeleteMediaParams,
  GetMediaDetailParams,
  GetSearchMediaHistoryQueryString,
  SearchMediaQueryString,
  ToggleBookmarkParams,
  ToggleLikeParams,
  UpdateMediaBody,
} from "./media.types";
import { searchHistoryTable } from "~/drizzle/schema/search";
import { and, asc, eq, like } from "drizzle-orm";
import {
  chunkTable,
  keypointTable,
  keywordTable,
  mediaBookmarkTable,
  mediaInfoTable,
  mediaLikeTable,
  mediaTable,
  summaryTable,
  transcriptTable,
} from "~/drizzle/schema/media";
import _ from "lodash";
import { CreateMediaFailedError, MediaNotFoundError } from "./media.errors";
import { keywordQueue } from "~/infra/jobs/workers/keyword";
import { keypointQueue } from "~/infra/jobs/workers/keypoint";
import { summaryQueue } from "~/infra/jobs/workers/summary";
import { TranscriptFoundError } from "../summary/summary.errors";

export const getSearchMediaHistory = async ({
  page = 1,
  size = 10,
}: GetSearchMediaHistoryQueryString) => {
  const offset = (page - 1) * size;
  const searchHistory = await db.query.searchHistoryTable.findMany({
    limit: size,
    offset,
  });

  const total = (await db.query.searchHistoryTable.findMany({})).length;
  return {
    data: searchHistory,
    metadata: {
      page,
      size,
      total,
    },
  };
};

export const addSearchHistory = async (keyword: string, userId: string) => {
  await db.insert(searchHistoryTable).values({
    userId,
    keyword,
  });
};

export const searchMedia = async (
  { keyword, page = 1, size = 10 }: SearchMediaQueryString,
  userId: string
) => {
  const offset = (page - 1) * size;
  const medias = await db.query.mediaTable.findMany({
    where: keyword ? like(mediaTable.title, keyword) : undefined,
    limit: size,
    offset,
    with: {
      creator: true,
    },
  });

  const total = (
    await db.query.mediaTable.findMany({
      where: keyword ? like(mediaTable.title, keyword) : undefined,
    })
  ).length;

  if (keyword) await addSearchHistory(keyword, userId);

  return {
    data: medias,
    metadata: {
      page,
      size,
      total,
    },
  };
};

export const searchMyMedia = async (
  { keyword, category, page = 1, size = 10 }: SearchMediaQueryString,
  userId: string
) => {
  const offset = (page - 1) * size;
  const medias = await db.query.mediaTable.findMany({
    where: and(
      keyword ? like(mediaTable.title, keyword) : undefined,
      category ? eq(mediaTable.category, category) : undefined,
      eq(mediaTable.userId, userId)
    ),
    limit: size,
    offset,
    with: {
      creator: true,
    },
  });

  const total = (
    await db.query.mediaTable.findMany({
      where: keyword ? like(mediaTable.title, keyword) : undefined,
    })
  ).length;

  if (keyword) await addSearchHistory(keyword, userId);

  return {
    data: medias,
    metadata: {
      page,
      size,
      total,
    },
  };
};

export const getMediaDetail = async ({ mediaId }: GetMediaDetailParams) => {
  const media = await db.query.mediaTable.findFirst({
    where: eq(mediaTable.id, mediaId),
    with: {
      creator: true,
    },
  });

  if (!media) {
    throw new MediaNotFoundError();
  }

  const mediaInfo = await db.query.mediaInfoTable.findFirst({
    where: eq(mediaInfoTable.mediaId, mediaId),
  });

  let transcript = await db.query.transcriptTable.findFirst({
    where: eq(transcriptTable.mediaId, mediaId),
  });

  if (transcript) {
    const chunks = await db.query.chunkTable.findMany({
      where: eq(chunkTable.transcriptId, transcript?.id),
      orderBy: [asc(chunkTable.time)],
    });

    Object.assign(transcript, { chunks });
  }

  const summary = await db.query.summaryTable.findFirst({
    where: eq(summaryTable.mediaId, mediaId),
  });

  const keywords = await db.query.keywordTable.findMany({
    where: eq(keywordTable.mediaId, mediaId),
  });

  const keypoints = await db.query.keypointTable.findMany({
    where: eq(keypointTable.mediaId, mediaId),
  });

  return {
    data: {
      ...media,
      ...mediaInfo,
      summary: summary,
      keywords: keywords,
      keypoints: keypoints,
      transcript,
    },
  };
};

export const createMedia = async (
  {
    title,
    description,
    category,
    mediaUrl,
    thumbnailUrl,
    transcript,
  }: CreateMediaBody,
  userId: string
) => {
  const media = _.first(
    await db
      .insert(mediaTable)
      .values({
        title,
        description,
        category,
        url: mediaUrl,
        thumbnail: thumbnailUrl,
        userId,
      })
      .returning()
  );

  if (!media) {
    throw new CreateMediaFailedError();
  }

  if (transcript) {
    const transcriptI = _.first(
      await db
        .insert(transcriptTable)
        .values({
          mediaId: media.id,
          content: transcript.text,
        })
        .returning()
    );

    if (transcriptI) {
      const chunksToInsert = transcript.chunks.map((chunk) => ({
        transcriptId: transcriptI.id,
        time: chunk.time,
        content: chunk.text,
      }));

      await db.insert(chunkTable).values(chunksToInsert);

      await Promise.all([
        keywordQueue.add("keyword", {
          mediaId: media.id,
          transcriptId: transcriptI.id,
          transcript: transcript.text,
        }),
        keypointQueue.add("keypoint", {
          mediaId: media.id,
          transcriptId: transcriptI.id,
          transcript: transcript.text,
        }),
        summaryQueue.add("summary", {
          mediaId: media.id,
          transcriptId: transcriptI.id,
          transcript: transcript.text,
        }),
      ]);
    }
  }

  return {
    data: media,
  };
};

export const toggleLike = async (
  { mediaId }: ToggleLikeParams,
  userId: string
) => {
  const media = await db.query.mediaTable.findFirst({
    where: eq(mediaTable.id, mediaId),
  });

  if (!media) {
    throw new MediaNotFoundError();
  }

  const like = await db.query.mediaLikeTable.findFirst({
    where: and(
      eq(mediaLikeTable.mediaId, mediaId),
      eq(mediaLikeTable.userId, userId)
    ),
  });

  if (!like) {
    const res = await db
      .insert(mediaLikeTable)
      .values({
        mediaId,
        userId,
        state: true,
      })
      .returning();
    return res;
  }

  const state = !like.state;
  const res = await db
    .update(mediaLikeTable)
    .set({
      state,
    })
    .where(
      and(
        eq(mediaLikeTable.mediaId, mediaId),
        eq(mediaLikeTable.userId, userId)
      )
    )
    .returning();
  return res;
};

export const toggleBookmark = async (
  { mediaId }: ToggleBookmarkParams,
  userId: string
) => {
  const media = await db.query.mediaTable.findFirst({
    where: eq(mediaTable.id, mediaId),
  });

  if (!media) {
    throw new MediaNotFoundError();
  }

  const bookmark = await db.query.mediaBookmarkTable.findFirst({
    where: and(
      eq(mediaBookmarkTable.mediaId, mediaId),
      eq(mediaBookmarkTable.userId, userId)
    ),
  });

  if (!bookmark) {
    const res = await db
      .insert(mediaBookmarkTable)
      .values({
        mediaId,
        userId,
        state: true,
      })
      .returning();
    return res;
  }

  const state = !bookmark.state;
  const res = await db
    .update(mediaBookmarkTable)
    .set({
      state,
    })
    .where(
      and(
        eq(mediaBookmarkTable.mediaId, mediaId),
        eq(mediaBookmarkTable.userId, userId)
      )
    )
    .returning();
  return res;
};

export const updateMedia = async (
  { mediaId, transcript, chunks }: UpdateMediaBody,
  userId: string
) => {
  const media = await db.query.mediaTable.findFirst({
    where: and(eq(mediaTable.id, mediaId), eq(mediaTable.userId, userId)),
  });

  if (!media) {
    throw new MediaNotFoundError();
  }

  const transcriptI = await db.query.transcriptTable.findFirst({
    where: and(
      eq(transcriptTable.mediaId, mediaId),
      eq(transcriptTable.id, transcript.id)
    ),
  });

  if (!transcriptI) {
    throw new TranscriptFoundError();
  }

  try {
    const transcriptRes = _.first(
      await db
        .update(transcriptTable)
        .set({
          id: transcript.id,
          mediaId: transcript.mediaId,
          content: transcript.content,
        })
        .where(eq(transcriptTable.id, transcript.id))
        .returning()
    );

    const chunksRes = await Promise.all(
      chunks.map(async (chunk) => {
        return _.first(
          await db
            .update(chunkTable)
            .set({
              content: chunk.content,
              time: chunk.time,
              transcriptId: transcript.id,
            })
            .where(eq(chunkTable.id, chunk.id))
            .returning()
        );
      })
    );

    return {
      transcript: transcriptRes,
      chunks: chunksRes,
    };
  } catch (error) {
    throw error;
  }
};

export const deleteMedia = async (
  { mediaId }: DeleteMediaParams,
  userId: string
) => {
  const checkMedia = await db.query.mediaTable.findFirst({
    where: and(eq(mediaTable.id, mediaId), eq(mediaTable.userId, userId)),
  });

  if (!checkMedia) {
    throw new MediaNotFoundError();
  }

  const media = _.first(
    await db.delete(mediaTable).where(eq(mediaTable.id, mediaId)).returning()
  );

  return {
    data: media,
  };
};
