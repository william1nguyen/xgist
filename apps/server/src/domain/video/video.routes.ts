import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { GetQueryString } from "~/infra/utils/schema";
import {
  createCommentVideo,
  getVideoComments,
} from "./services/comment.services";
import { checkIsLiked, likeVideo, unlikeVideo } from "./services/like.services";
import {
  getVideoDetail,
  getVideos,
  uploadVideo,
} from "./services/video.services";
import {
  CheckIsLikedParams,
  CreateCommentBody,
  CreateCommentResponse,
  GetCommentsParams,
  GetCommentsResponse,
  GetVideoDetailParams,
  GetVideoDetailResponse,
  GetVideosResponse,
  LikeVideoParams,
  LikeVideoResponse,
  UnlikeVideoParams,
  UnlikeVideoResponse,
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
        response: {
          200: GetVideosResponse,
        },
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await getVideos(req.query);
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
        response: {
          200: GetVideoDetailResponse,
        },
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await getVideoDetail(req.params);
      return res;
    }
  );

  app.get(
    "/:videoId/comments",
    {
      schema: {
        tags: tags,
        description: "Lấy dữ liệu bình luận của một video",
        querystring: GetQueryString,
        params: GetCommentsParams,
        response: {
          200: GetCommentsResponse,
        },
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await getVideoComments(req.query, req.params);
      return res;
    }
  );

  app.get(
    "/:videoId/isLiked",
    {
      schema: {
        tags: tags,
        description: "Kiểm tra người dùng đã từng like video hay chưa ?",
        params: CheckIsLikedParams,
      },
    },
    async (req) => {
      const res = await checkIsLiked(req.params, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "",
    {
      schema: {
        tags: tags,
        description: "Đăng tải một video mới",
        consumes: ["multipart/form-data"],
        body: UploadVideoBody,
      },
    },
    async (req) => {
      const res = await uploadVideo(req.body, req.principal.user.id);
      return res;
    }
  );

  app.post(
    "/comments",
    {
      schema: {
        tags: tags,
        description: "Bình luận một video",
        body: CreateCommentBody,
        response: {
          200: CreateCommentResponse,
        },
      },
    },
    async (req) => {
      const res = await createCommentVideo(req.body, req.principal?.user?.id);
      return res;
    }
  );

  app.post(
    "/:videoId/like",
    {
      schema: {
        tags: tags,
        description: "Thích một video",
        params: LikeVideoParams,
        response: {
          200: LikeVideoResponse,
        },
      },
    },
    async (req) => {
      const res = await likeVideo(req.params, req.principal?.user?.id);
      return res;
    }
  );

  app.post(
    "/:videoId/unlike",
    {
      schema: {
        tags: tags,
        description: "Bỏ thích một video",
        params: UnlikeVideoParams,
        response: {
          200: UnlikeVideoResponse,
        },
      },
    },
    async (req) => {
      const res = await unlikeVideo(req.params, req.principal?.user?.id);
      return res;
    }
  );
};
