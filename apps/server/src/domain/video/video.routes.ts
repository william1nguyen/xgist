import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { GetQueryString } from "~/infra/utils/schema";
import {
  getBookmarkedVideos,
  getVideoDetail,
  getVideos,
  postVideo,
  summarizeVideo,
  toggleBookmark,
  toggleLike,
} from "./video.services";
import {
  GetVideoDetailParams,
  SummarizeVideoBody,
  ToggleBookmarkParams,
  ToggleLikeParams,
  UploadVideoBody,
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
      const res = await getVideos(req.query, req.principal?.user?.id);
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
      const res = await getVideoDetail(req.params, req.principal?.user?.id);
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
    "",
    {
      schema: {
        tags: tags,
        description: "Đăng một video",
        body: UploadVideoBody,
      },
    },
    async (req) => {
      const res = await postVideo(req.body, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "/summarize",
    {
      schema: {
        tags: tags,
        description: "Tóm tắt một video",
        body: SummarizeVideoBody,
      },
    },
    async (req) => {
      const res = await summarizeVideo(req.body);
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
