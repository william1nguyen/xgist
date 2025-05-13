import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  CreateMediaBody,
  CreateMediaResponse,
  DeleteMediaParams,
  GetMediaDetailParams,
  GetMediaDetailResponse,
  GetSearchMediaHistoryQueryString,
  GetSearchMediaHistoryResponse,
  SearchMediaQueryString,
  SearchMediaResponse,
  ToggleBookmarkParams,
  ToggleLikeParams,
  UpdateMediaBody,
} from "./media.types";
import {
  createMedia,
  deleteMedia,
  getMediaDetail,
  getSearchMediaHistory,
  searchMedia,
  searchMyMedia,
  toggleBookmark,
  toggleLike,
  updateMedia,
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
    "/me",
    {
      schema: {
        tags,
        description: "Get my medias",
        querystring: SearchMediaQueryString,
      },
    },
    async (req) => {
      const res = await searchMyMedia(req.query, req.principal.user.id);
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

  app.put(
    "",
    {
      schema: {
        tags,
        description: "Update media",
        body: UpdateMediaBody,
      },
    },
    async (req) => {
      const res = await updateMedia(req.body, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "/:mediaId/toggle-bookmark",
    {
      schema: {
        tags: tags,
        description: "Toggle bookmark a media",
        params: ToggleBookmarkParams,
      },
    },
    async (req) => {
      const res = await toggleBookmark(req.params, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "/:mediaId/toggle-like",
    {
      schema: {
        tags: tags,
        description: "Toggle like a video",
        params: ToggleLikeParams,
      },
    },
    async (req) => {
      const res = await toggleLike(req.params, req.principal.user.id);
      return res;
    }
  );

  app.delete(
    "/:mediaId",
    {
      schema: {
        tags,
        description: "Remove media",
        params: DeleteMediaParams,
      },
    },
    async (req) => {
      const res = await deleteMedia(req.params, req.principal.user.id);
      return res;
    }
  );
};
