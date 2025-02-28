import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { GetQueryString } from "~/infra/utils/schema";
import { getVideoDetail, getVideos } from "./video.services";
import { GetVideoDetailParams, GetVideosResponse } from "./video.types";

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
};
