import type {FastifyPluginAsyncTypebox} from '@fastify/type-provider-typebox';
import {
  CreateMediaBody,
  CreateMediaResponse,
  GetMediaDetailParams,
  GetMediaDetailResponse,
  RemoveMediaParams,
  RemoveMediaResponse,
  SearchMediaQueryString,
  SearchMediaResponse,
  UpdateMediaBody,
  UpdateMediaParams,
  UpdateMediaResponse,
} from './media.types';
import {
  createMedia,
  getMediaDetail,
  removeMedia,
  search,
  updateMedia,
} from './services/media.services';

const tags = ['Media'];

export const mediaRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    {
      schema: {
        tags,
        querystring: SearchMediaQueryString,
        response: {
          200: SearchMediaResponse,
        },
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await search(req.query);
      return res;
    }
  );

  app.get(
    '/:mediaId',
    {
      schema: {
        tags,
        params: GetMediaDetailParams,
        response: {
          200: GetMediaDetailResponse,
        },
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await getMediaDetail(req.params);
      return res;
    }
  );

  app.post(
    '/',
    {
      schema: {
        tags,
        body: CreateMediaBody,
        response: {
          200: CreateMediaResponse,
        },
      },
    },
    async (req) => {
      const res = await createMedia(req.body, req.principal.user.id);
      return res;
    }
  );

  app.put(
    '/:mediaId',
    {
      schema: {
        tags,
        params: UpdateMediaParams,
        body: UpdateMediaBody,
        response: {
          200: UpdateMediaResponse,
        },
      },
    },
    async (req) => {
      const res = await updateMedia(
        req.params,
        req.body,
        req.principal.user.id
      );
      return res;
    }
  );

  app.delete(
    '/:mediaId',
    {
      schema: {
        tags,
        params: RemoveMediaParams,
        response: {
          200: RemoveMediaResponse,
        },
      },
    },
    async (req) => {
      const res = await removeMedia(req.params, req.principal.user.id);
      return res;
    }
  );
};
