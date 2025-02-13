import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { userRoutes } from "./user.routes";

export const userModule: FastifyPluginAsyncTypebox = async (app) => {
  app.register(userRoutes, { prefix: "/users" });
};
