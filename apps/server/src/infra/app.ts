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
import { Server } from "socket.io";
import { redisDefault } from "./redis";
import { INotification } from "./jobs/workers/summarize";
import logger from "./logger";
import { videoV2Module } from "~/domain/videov2/videov2.module";

const app = fastify({ logger: true });

app.register(fastifyCors, {
  origin: [env.APP_URL],
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

export const io = new Server(app.server, {
  cors: {
    origin: env.APP_URL,
    methods: ["GET", "POST"],
    credentials: false,
  },
});

io.on("connection", (socket) => {
  socket.on("notification-readed", async (data) => {
    try {
      const key = data.key;
      const values = await redisDefault.lrange(key, 0, -1);

      if (!values) return;

      const value = values[0];
      const notification = JSON.parse(value) as INotification;
      notification.read = true;

      await redisDefault.set(key, JSON.stringify(notification));
    } catch (error) {
      logger.error(`Failed to update key : ${error}`);
    }
  });
});

app.register(bullBoardPlugin, { queues: queues, path: "/bullboard" });
app.register(userModule);
app.register(videoModule);
app.register(videoV2Module);

export { app };
