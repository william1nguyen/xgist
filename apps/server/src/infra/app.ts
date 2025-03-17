import fastifyCors from "@fastify/cors";
import FastifyRateLimit from "@fastify/rate-limit";
import fastifyMultipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import fastify from "fastify";
import { execSecurityHandlerChain } from "~/domain/user/security-plugin/plugin";
import { userModule } from "~/domain/user/user.module";
import { videoModule } from "~/domain/video/video.module";
import { env } from "~/env";
import { bullBoardPlugin } from "./bullboard";
import { queues } from "./jobs";

const app = fastify({ logger: true });

app.register(fastifyCors, {
  origin: [
    "http://localhost:5173",
    "https://xgist.powerful.cuddly-succotash.online",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

app.register(FastifyRateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

app.addHook("preHandler", execSecurityHandlerChain);

app.register(fastifyMultipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024,
  },
});

if (env.NODE_ENV !== "production") {
  app.register(swagger, {
    mode: "dynamic",
    swagger: {
      info: {
        title: "API Documentation",
        version: "1.0.0",
      },
    },
  });
  app.register(scalar, { routePrefix: "/api-reference" });
}

app.register(bullBoardPlugin, { queues: queues, path: "/bullboard" });
app.register(userModule);
app.register(videoModule);

export { app };
