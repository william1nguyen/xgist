import type {FastifyPluginAsyncTypebox} from '@fastify/type-provider-typebox';
import {mediaRoutes} from './media.routes';

export const mediaModule: FastifyPluginAsyncTypebox = async (app) => {
  app.register(mediaRoutes, {prefix: '/v1/media'});
};
