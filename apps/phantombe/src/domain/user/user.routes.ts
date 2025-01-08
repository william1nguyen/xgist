import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import logger from "~/infra/logger";
import { itemResponse } from "~/infra/utils/fns";
import {
  follow,
  getAllFollowings,
  getUser,
  login,
  register,
} from "./user.services";
import {
  FollowUserBody,
  GetUserInfoResponse,
  LoginParams,
  LoginResponse,
  RegisterBody,
  RegisterResponse,
} from "./user.types";

const tags = ["User"];

export const userRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/me",
    {
      schema: {
        tags: tags,
        description: "Lấy thông tin của tài khoản đang đăng nhập",
        response: {
          200: GetUserInfoResponse,
        },
      },
    },
    async (req) => {
      const user = await getUser(req.principal.userId);
      return itemResponse({ user });
    }
  );

  app.get(
    "/following",
    {
      schema: {
        tags: tags,
        description: "Lấy thông tin những người mình đang theo dõi",
      },
    },
    async (req) => {
      const followings = await getAllFollowings(req.principal.userId);
      return followings;
    }
  );

  app.post(
    "/login",
    {
      schema: {
        tags: tags,
        description: "API đăng nhập",
        body: LoginParams,
        response: {
          200: LoginResponse,
        },
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await login(req.body);
      return res;
    }
  );

  app.post(
    "/register",
    {
      schema: {
        tags: tags,
        description: "Đăng ký người dùng",
        body: RegisterBody,
        response: {
          200: RegisterResponse,
        },
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const user = await register(req.body);
      return itemResponse({ user });
    }
  );

  app.post(
    "/follow",
    {
      schema: {
        tags: tags,
        description: "Theo dõi một người dùng",
        body: FollowUserBody,
      },
    },
    async (req) => {
      const user = await follow(req.body, req.principal.userId);
      return user;
    }
  );

  app.post(
    "/unfollow",
    {
      schema: {
        tags: tags,
        description: "Theo dõi một người dùng",
        body: FollowUserBody,
      },
    },
    async (req) => {
      const user = await follow(req.body, req.principal.userId);
      return user;
    }
  );
};
