import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  CreateMediaBody,
  CreateMediaResponse,
  GetMediaDetailParams,
  GetMediaDetailResponse,
  GetSearchMediaHistoryQueryString,
  GetSearchMediaHistoryResponse,
  SearchMediaQueryString,
  SearchMediaResponse,
} from "./media.types";
import {
  createMedia,
  getMediaDetail,
  getSearchMediaHistory,
  searchMedia,
} from "./media.services";

const tags = ["media"];

export const mediaRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "",
    {
      schema: {
        tags,
        description: "Get medias",
        querystring: SearchMediaQueryString,
        response: {
          200: SearchMediaResponse,
        },
      },
    },
    async (req) => {
      const res = await searchMedia(req.query, req.principal.user.id);
      return res;
    }
  );

  app.get(
    "/:mediaId",
    {
      schema: {
        tags,
        description: "Get media detail",
        params: GetMediaDetailParams,
        response: {
          200: GetMediaDetailResponse,
        },
      },
    },
    async (req) => {
      const res = await getMediaDetail(req.params);
      return res;
    }
  );

  app.get(
    "/search-history",
    {
      schema: {
        tags,
        description: "Get media search history",
        querystring: GetSearchMediaHistoryQueryString,
        response: {
          200: GetSearchMediaHistoryResponse,
        },
      },
    },
    async (req) => {
      const res = await getSearchMediaHistory(req.query);
      return res;
    }
  );

  app.post(
    "",
    {
      schema: {
        tags,
        description: "Create new media",
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
};
