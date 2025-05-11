import { db } from "~/drizzle/db";
import {
  CreateMediaBody,
  GetMediaDetailParams,
  GetSearchMediaHistoryQueryString,
  SearchMediaQueryString,
  ToggleBookmarkParams,
  ToggleLikeParams,
  UpdateMediaBody,
} from "./media.types";
import { searchHistoryTable } from "~/drizzle/schema/search";
import { and, eq, like } from "drizzle-orm";
import {
  mediaBookmarkTable,
  mediaInfoTable,
  mediaLikeTable,
  mediaTable,
} from "~/drizzle/schema/media";
import _ from "lodash";
import { CreateMediaFailedError, MediaNotFoundError } from "./media.errors";

export const validateMedia = async (mediaId: string) => {};

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
  });

  if (!media) {
    throw new MediaNotFoundError();
  }

  const mediaInfo = await db.query.mediaInfoTable.findFirst({
    where: eq(mediaInfoTable.mediaId, mediaId),
  });

  return {
    data: {
      ...media,
      ...mediaInfo,
    },
  };
};

export const createMedia = async (
  { title, description, category, videoUrl, thumbnailUrl }: CreateMediaBody,
  userId: string
) => {
  const media = _.first(
    await db
      .insert(mediaTable)
      .values({
        title,
        description,
        category,
        url: videoUrl,
        thumbnail: thumbnailUrl,
        userId,
      })
      .returning()
  );

  if (!media) {
    throw new CreateMediaFailedError();
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

export const updateMediaInfo = async ({
  mediaId,
  views,
  isSummarized,
}: UpdateMediaBody) => {};

export const deleteMedia = async () => {};
