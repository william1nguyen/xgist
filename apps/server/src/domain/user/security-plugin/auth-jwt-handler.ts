import type { FastifyRequest } from "fastify";
import { extractPayload } from "~/infra/utils/jwt";
import { matchAnyRegex } from "~/infra/utils/regex";
import {
  ExpiredTokenError,
  InvalidAuthTokenError,
  NotLoggedInError,
} from "../user.errors";
import { getUserByKeycloakUserId } from "../user.services";
import type { KeycloakPrincipal, User } from "../user.types";
import type { SecurityHandlerOptions } from "./types";
import logger from "~/infra/logger";

const AUTH_HEADER_NAME = "authorization";
const AUTH_HEADER_PREFIX = "Bearer ";
const IGNORED_ROUTES: RegExp | RegExp[] = [
  /^\/api-reference/,
  /^\/healthz/,
  /^\/bullboard/,
];

const extractAccessToken = (req: FastifyRequest) => {
  const header = req.headers[AUTH_HEADER_NAME];
  const prefix = AUTH_HEADER_PREFIX;
  return header?.substring(prefix.length);
};

const extractAccessTokenOrThrow = (req: FastifyRequest) => {
  const accessToken = extractAccessToken(req);
  if (!accessToken) {
    throw new NotLoggedInError();
  }

  return accessToken;
};

export const authJwtHandler: SecurityHandlerOptions = {
  shouldHandle: async (req) => {
    const routeIsIgnored = matchAnyRegex(req.url, IGNORED_ROUTES);
    if (routeIsIgnored) {
      return false;
    }

    const shouldSkipAuth = req.routeOptions.config.shouldSkipAuth;
    const accessToken = extractAccessToken(req);

    return Boolean(accessToken) || !shouldSkipAuth;
  },
  onHandle: async (req) => {
    const shoudldHandleHybrid = req.routeOptions.config.shouldHanldeHybrid;
    try {
      const accessToken = extractAccessTokenOrThrow(req);
      const { sub, exp } = await extractPayload(accessToken);

      if (!sub) {
        throw new InvalidAuthTokenError();
      }

      const expiratedTimeInMs = exp * 1000;
      const now = new Date().getTime();

      if (expiratedTimeInMs < now) {
        throw new ExpiredTokenError();
      }

      const user = (await getUserByKeycloakUserId(sub)) as User;
      const principal: KeycloakPrincipal = {
        sub,
        user,
        token: accessToken,
      };
      req.principal = principal;
    } catch (error) {
      if (!shoudldHandleHybrid) {
        throw new InvalidAuthTokenError();
      }
    }
  },
};
