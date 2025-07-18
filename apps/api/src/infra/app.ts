import fastifyMultipart from '@fastify/multipart';
import FastifyRateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import fastify from 'fastify';
import {execSecurityHandlerChain} from '~/domain/user/security-plugin/plugin';
import {userModule} from '~/domain/user/user.module';
import {env} from '~/env';
import {bullBoardPlugin} from './bullboard';
import {queues} from './jobs';

const app = fastify({logger: true});

app.register(FastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

app.addHook('preHandler', execSecurityHandlerChain);

app.register(fastifyMultipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024,
  },
});

if (env.NODE_ENV !== 'production') {
  app.register(swagger, {
    mode: 'dynamic',
    swagger: {
      info: {
        title: 'API Documentation',
        version: '1.0.0',
      },
    },
  });
  app.register(scalar, {routePrefix: '/api-reference'});
}

app.register(bullBoardPlugin, {queues: queues, path: '/bullboard'});
app.register(userModule);

export {app};
