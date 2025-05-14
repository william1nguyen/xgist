import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { agentRoutes } from "./agent.routes";

export const agentModule: FastifyPluginAsyncTypebox = async (app) => {
  app.register(agentRoutes, { prefix: "/v1/agent" });
};
