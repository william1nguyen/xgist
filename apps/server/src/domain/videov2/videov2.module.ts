import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { videoV2Routes } from "./videov2.routes";

export const videoV2Module: FastifyPluginAsyncTypebox = async (app) => {
  app.register(videoV2Routes, { prefix: "/v2/videos" });
};
