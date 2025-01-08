import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { userRoutes } from "./user.routes";

export const userModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(userRoutes, { prefix: "/v1/users" });
};
