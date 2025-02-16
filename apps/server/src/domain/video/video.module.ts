import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { videoRoutes } from "./video.routes";

export const videoModule: FastifyPluginAsyncTypebox = async (app) => {
  app.register(videoRoutes, { prefix: "/v1/videos" });
};
