import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { uploadRoutes } from "./upload.routes";

export const uploadModule: FastifyPluginAsyncTypebox = async (app) => {
  app.register(uploadRoutes, { prefix: "/v1/upload" });
};
