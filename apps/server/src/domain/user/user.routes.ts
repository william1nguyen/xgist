import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getUserInfo, registerUser } from "./user.services";
import { KeycloakWebhookPayload, RegisterResponse } from "./user.types";

const tags = ["users"];

export const userRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/me",
    {
      schema: {
        tags: tags,
        description: "Lấy thông tin người dùng hiện tại",
      },
    },
    async (req) => {
      const user = await getUserInfo(req.principal?.user);
      return user;
    }
  );

  app.post(
    "/register",
    {
      schema: {
        tags: tags,
        description: "Webhook lắng nghe sự kiện đăng kí từ keycloak",
        body: KeycloakWebhookPayload,
        response: {
          200: RegisterResponse,
        },
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      console.log(req.body);
      const user = registerUser(req.body);
      return user;
    }
  );
};
