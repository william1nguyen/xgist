import type {FastifyPluginAsyncTypebox} from '@fastify/type-provider-typebox';
import {getUserInfo, register} from './user.services';
import {KeycloakWebhookPayload, RegisterResponse, User} from './user.types';

const tags = ['User'];

export const userRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/me',
    {
      schema: {
        tags,
        description: 'Get current user information',
        response: {
          200: User,
        },
      },
    },
    async (req) => {
      const user = await getUserInfo(req.principal?.user?.id);
      return user;
    }
  );

  app.post(
    '/register',
    {
      schema: {
        tags,
        description: 'Webhook endpoint for Keycloak user registration events',
        body: KeycloakWebhookPayload,
        response: {
          200: RegisterResponse,
        },
      },
    },
    async (req) => {
      const user = await register(req.body);
      return user;
    }
  );
};
