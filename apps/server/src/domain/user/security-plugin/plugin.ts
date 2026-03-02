import type { FastifyRequest } from "fastify";

import type { KeycloakPrincipal } from "../user.types";
import type { SecurityHandlerOptions } from "./types";

import { authJwtHandler } from "./auth-jwt-handler";

const createHandler =
  ({ shouldHandle, onHandle }: SecurityHandlerOptions) =>
  async (req: FastifyRequest) => {
    if (await shouldHandle(req)) {
      await onHandle(req);
    }
  };

export const execSecurityHandlerChain = async (request: FastifyRequest): Promise<void> => {
  const handlers = [authJwtHandler].map(createHandler);

  for (const handler of handlers) {
    await handler(request);
  }
};

declare module "fastify" {
  export interface FastifyRequest {
    principal: KeycloakPrincipal;
  }

  export interface FastifyContextConfig {
    rawBody?: boolean;
    shouldSkipAuth?: boolean;
    shouldHanldeHybrid?: boolean;
    skipCache?: boolean;
    useAdminAuth?: boolean;
  }
}
