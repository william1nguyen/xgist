import type {FastifyRequest} from 'fastify';
import {jwtDecode} from 'jwt-decode';
import {matchAnyRegex} from '~/infra/utils/regex';
import {
  ExpiredTokenError,
  NotLoggedInError,
  UserNotFoundError,
} from '../user.errors';
import type {Principal} from '../user.types';
import type {SecurityHandlerOptions} from './types';

const AUTH_HEADER_NAME = 'authorization';
const AUTH_HEADER_PREFIX = 'Bearer ';
const IGNORED_ROUTES = [/^\/api-reference/];

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
    const accessToken = extractAccessTokenOrThrow(req);
    const {sub, exp} = jwtDecode(accessToken);

    if (!exp) {
      throw new ExpiredTokenError();
    }

    const expiredTimeInMs = exp * 1000;
    const now = new Date().getTime();

    if (expiredTimeInMs < now) {
      throw new ExpiredTokenError();
    }

    if (!sub) {
      throw new UserNotFoundError();
    }

    const principal: Principal = {
      userId: sub,
    };

    req.principal = principal;
  },
};
