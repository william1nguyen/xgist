import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  deleteVideo,
  getUserVideos,
  getVideos,
  likeVideo,
  unlikeVideo,
  uploadVideo,
} from "./video.services";
import {
  DeleteVideoParams,
  GetUserVideoParams,
  GetVideoQueryString,
  LikeVideoBody,
  UnLikeVideoBody,
  UploadVideoBody,
} from "./video.types";

const tags = ["video"];

export const videoRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "",
    {
      schema: {
        tags: tags,
        description: "Lấy danh sách thông tin videos",
        querystring: GetVideoQueryString,
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
    "/user/:userId",
    {
      schema: {
        tags: tags,
        description: "Lấy danh sách videos tạo bởi người dùng",
        params: GetUserVideoParams,
        querystring: GetVideoQueryString,
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await getUserVideos(req.query, req.params);
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
      const res = await uploadVideo(req.body, req.principal.userId);
      return res;
    }
  );

  app.delete(
    "/:videoId",
    {
      schema: {
        tags: tags,
        description: "Xoá video",
        params: DeleteVideoParams,
      },
    },
    async (req) => {
      const res = await deleteVideo(req.params, req.principal.userId);
      return res;
    }
  );

  app.post(
    "/like",
    {
      schema: {
        tags: tags,
        description: "Thích một video",
        body: LikeVideoBody,
      },
    },
    async (req) => {
      const res = await likeVideo(req.body, req.principal.userId);
      return res;
    }
  );

  app.post(
    "/unlike",
    {
      schema: {
        tags: tags,
        description: "Bỏ thích một video",
        body: UnLikeVideoBody,
      },
    },
    async (req) => {
      const res = await unlikeVideo(req.body, req.principal.userId);
      return res;
    }
  );
};
