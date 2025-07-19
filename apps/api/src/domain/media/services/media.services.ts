import {and, count, eq, like} from 'drizzle-orm';
import _ from 'lodash';
import {db} from '~/drizzle/db';
import {mediaTable} from '~/drizzle/schema';
import {itemResponse} from '~/infra/utils/fns';
import {
  CreateMediaFailedError,
  MediaNotFoundError,
  RemoveMediaFailedError,
  UpdateMediaFailedError,
} from '../media.errors';
import type {
  CreateMediaBody,
  GetMediaDetailParams,
  RemoveMediaParams,
  SearchMediaQueryString,
  UpdateMediaBody,
  UpdateMediaParams,
} from '../media.types';

export const search = async ({
  page = 1,
  size = 10,
  name,
  mediaId,
}: SearchMediaQueryString) => {
  const offset = (page - 1) * size;

  const [medias, total] = await Promise.all([
    await db.query.mediaTable.findMany({
      where: and(
        mediaId ? eq(mediaTable.id, mediaId) : undefined,
        name ? like(mediaTable.name, name) : undefined
      ),
      limit: size,
      offset,
    }),

    await db
      .select({count: count()})
      .from(mediaTable)
      .where(
        and(
          mediaId ? eq(mediaTable.id, mediaId) : undefined,
          name ? like(mediaTable.name, name) : undefined
        )
      ),
  ]);

  return {
    data: {
      medias,
    },
    metadata: {
      page,
      size,
      total: total[0]?.count,
    },
  };
};

export const getMediaDetail = async ({mediaId}: GetMediaDetailParams) => {
  const media = await db.query.mediaTable.findFirst({
    where: eq(mediaTable.id, mediaId),
  });

  if (!media) {
    throw new MediaNotFoundError();
  }

  return itemResponse({media});
};

export const createMedia = async (
  {name, type, url}: CreateMediaBody,
  userId: string
) => {
  const media = _.first(
    await db
      .insert(mediaTable)
      .values({
        userId,
        name,
        type,
        url,
      })
      .returning()
  );

  if (!media) {
    throw new CreateMediaFailedError();
  }

  return itemResponse({media});
};

export const updateMedia = async (
  {mediaId}: UpdateMediaParams,
  {name}: UpdateMediaBody,
  userId: string
) => {
  const media = _.first(
    await db
      .update(mediaTable)
      .set({
        name,
      })
      .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.userId, userId)))
      .returning()
  );

  if (!media) {
    throw new UpdateMediaFailedError();
  }

  return itemResponse({media});
};

export const removeMedia = async (
  {mediaId}: RemoveMediaParams,
  userId: string
) => {
  const media = _.first(
    await db
      .delete(mediaTable)
      .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.userId, userId)))
      .returning()
  );

  if (!media) {
    throw new RemoveMediaFailedError();
  }

  return itemResponse({media});
};

export const likeMedia = async () => {};

export const unlikeMedia = async () => {};
