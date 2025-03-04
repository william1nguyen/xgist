import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { GetQueryString } from "~/infra/utils/schema";
import {
  getBookmarkedVideos,
  getVideoDetail,
  getVideos,
  toggleBookmark,
  toggleLike,
} from "./video.services";
import {
  GetVideoDetailParams,
  GetVideoDetailResponse,
  GetVideosResponse,
  ToggleBookmarkParams,
  ToggleLikeParams,
} from "./video.types";

const tags = ["video"];

export const videoRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "",
    {
      schema: {
        tags: tags,
        description: "Lấy dữ liệu videos",
        querystring: GetQueryString,
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await getVideos(req.query, req.principal.user.id);
      return res;
    }
  );

  app.get(
    "/:videoId",
    {
      schema: {
        tags: tags,
        description: "Lấy dữ liệu chi tiết của một video",
        params: GetVideoDetailParams,
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await getVideoDetail(req.params, req.principal.user.id);
      return res;
    }
  );

  app.get(
    "/bookmarks",
    {
      schema: {
        tags: tags,
        description: "Lấy video đã được đánh dấu",
        querystring: GetQueryString,
      },
    },
    async (req) => {
      const res = await getBookmarkedVideos(req.query, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "/:videoId/bookmark",
    {
      schema: {
        tags: tags,
        description: "Đánh dấu một video",
        params: ToggleBookmarkParams,
      },
    },
    async (req) => {
      const res = await toggleBookmark(req.params, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "/:videoId/like",
    {
      schema: {
        tags: tags,
        description: "Thích một video",
        params: ToggleLikeParams,
      },
    },
    async (req) => {
      const res = await toggleLike(req.params, req.principal.user.id);
      return res;
    }
  );
};
