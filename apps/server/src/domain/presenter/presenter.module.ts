import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { presenterRoutes } from "./presenter.routes";

export const presenterModule: FastifyPluginAsyncTypebox = async (app) => {
  app.register(presenterRoutes, { prefix: "/v1/presenter" });
};
