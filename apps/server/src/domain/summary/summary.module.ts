import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { summaryRoutes } from "./summary.routes";

export const summaryModule: FastifyPluginAsyncTypebox = async (app) => {
  app.register(summaryRoutes, { prefix: "/v1/summary" });
};
