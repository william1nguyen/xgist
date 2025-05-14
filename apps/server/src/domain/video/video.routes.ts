import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { GetQueryString } from "~/infra/utils/schema";
import {
  generatePresenter,
  getBookmarkedVideos,
  getMyVideos,
  getNotifications,
  getPresenterDetail,
  getPresenters,
  getRelatedVideos,
  getSearchMediaHistory,
  getVideoDetail,
  getVideos,
  postVideo,
  summarizeVideo,
  toggleBookmark,
  toggleLike,
  updateVideo,
  updateVideoViews,
} from "./video.services";
import {
  ActivitiesResponse,
  CategoryStatsResponse,
  GeneratePresenterBody,
  GetPresenterDetailParams,
  GetPresenterQueryString,
  GetRelatedVideosParams,
  GetRelatedVideosQuerystring,
  GetSearchMediaHistoryQueryString,
  GetVideoDetailParams,
  GetVideosQueryString,
  PresenterWebhookBody,
  StatisticsResponse,
  SummarizeVideoBody,
  ToggleBookmarkParams,
  ToggleLikeParams,
  UpdateVideoBody,
  UpdateVideoViewsBody,
  UploadVideoBody,
} from "./video.types";
import {
  getCategoryStats,
  getUserActivities,
  getUserStatistics,
} from "./stats.service";
import { db } from "~/drizzle/db";
import { eq } from "drizzle-orm";
import { presenterTable } from "~/drizzle/schema/video";

const tags = ["video"];

export const videoRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/notifications",
    {
      schema: {
        tags: tags,
        description: "Lấy dữ liệu videos",
        querystring: GetQueryString,
      },
    },
    async (req) => {
      const res = await getNotifications(req.query, req.principal.user.id);
      return res;
    }
  );

  app.get(
    "",
    {
      schema: {
        tags: tags,
        description: "Lấy dữ liệu videos",
        querystring: GetVideosQueryString,
      },
      config: {
        shouldHanldeHybrid: true,
      },
    },
    async (req) => {
      const res = await getVideos(req.query, req.principal?.user?.id);
      return res;
    }
  );

  app.get(
    "/me",
    {
      schema: {
        tags: tags,
        description: "Lấy dữ liệu videos của bản thân",
        querystring: GetQueryString,
      },
    },
    async (req) => {
      const res = await getMyVideos(req.query, req.principal.user.id);
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
        shouldHanldeHybrid: true,
      },
    },
    async (req) => {
      const res = await getVideoDetail(req.params, req.principal?.user?.id);
      return res;
    }
  );

  app.get(
    "/:videoId/related",
    {
      schema: {
        tags: tags,
        description: "Lấy dữ liệu các video liên quan",
        params: GetRelatedVideosParams,
        querystring: GetRelatedVideosQuerystring,
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await getRelatedVideos(req.params, req.query);
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

  app.get(
    "/categories/stats",
    {
      schema: {
        response: {
          200: CategoryStatsResponse,
        },
      },
    },
    async (req) => {
      const categories = await getCategoryStats(req.principal.user.id);

      return {
        success: true,
        data: {
          categories,
        },
      };
    }
  );

  app.get(
    "/user/activities",
    {
      schema: {
        response: {
          200: ActivitiesResponse,
        },
      },
    },
    async (req) => {
      const activities = await getUserActivities(req.principal.user.id);

      return {
        success: true,
        data: {
          activities,
        },
      };
    }
  );

  app.get(
    "/me/statistics",
    {
      schema: {
        response: {
          200: StatisticsResponse,
        },
      },
    },
    async (req) => {
      const statistics = await getUserStatistics(req.principal.user.id);

      return {
        success: true,
        data: statistics,
      };
    }
  );

  app.get(
    "/search-history",
    {
      schema: {
        tags,
        description: "Get media search history",
        querystring: GetSearchMediaHistoryQueryString,
      },
    },
    async (req) => {
      const res = await getSearchMediaHistory(req.query, req.principal.user.id);
      return res;
    }
  );

  app.get(
    "/presenters",
    {
      schema: {
        tags,
        querystring: GetPresenterQueryString,
      },
    },
    async (req) => {
      const res = await getPresenters(req.query, req.principal.user.id);
      return res;
    }
  );

  app.get(
    "/presenters/:presenterId",
    {
      schema: {
        tags,
        params: GetPresenterDetailParams,
      },
    },
    async (req) => {
      const res = await getPresenterDetail(req.params, req.principal.user.id);
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

  app.put(
    "",
    {
      schema: {
        tags: tags,
        description: "Cập nhật một video",
        body: UpdateVideoBody,
      },
    },
    async (req) => {
      const res = await updateVideo(req.body, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "/generate-presenter",
    {
      schema: {
        tags: tags,
        description: "Tạo video presenter",
        body: GeneratePresenterBody,
      },
    },
    async (req) => {
      const res = generatePresenter(req.body, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "/presenter/webhook",
    {
      schema: {
        tags: tags,
        description: "presenter webhook",
        body: PresenterWebhookBody,
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const { id, result_url } = req.body as any;
      const res = await db
        .update(presenterTable)
        .set({
          url: result_url,
        })
        .where(eq(presenterTable.presenterId, id));

      return res;
    }
  );

  app.post(
    "/views",
    {
      schema: {
        tags: tags,
        description: "Xem một video",
        body: UpdateVideoViewsBody,
      },
      config: {
        shouldSkipAuth: true,
        rateLimit: {
          max: 3,
          timeWindow: "1hour",
        },
      },
    },
    async (req) => {
      const res = await updateVideoViews(req.body);
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
      config: {
        shouldSkipAuth: true,
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
