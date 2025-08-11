import fastifyCors from "@fastify/cors";
import FastifyRateLimit from "@fastify/rate-limit";
import fastifyMultipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import fastify from "fastify";
import helmet from "@fastify/helmet";
import underPressure from "@fastify/under-pressure";
import * as Sentry from "@sentry/node";
import { execSecurityHandlerChain } from "~/domain/user/security-plugin/plugin";
import { userModule } from "~/domain/user/user.module";
import { videoModule } from "~/domain/video/video.module";
import { bullBoardPlugin } from "./bullboard";
import { queues } from "./jobs";
import { Server } from "socket.io";
import { redisDefault } from "./redis";
import { INotification } from "./jobs/workers/summarize";
import logger from "./logger";
import { observeHttp, register as metricsRegister } from "./metrics";
import { env } from "~/env";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.0),
    environment: process.env.NODE_ENV,
  });
}

const app = fastify({ logger: true });

app.register(helmet);

app.register(underPressure, {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 200 * 1024 * 1024,
  maxRssBytes: 300 * 1024 * 1024,
});

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

app.get("/healthz", async () => ({ status: "ok" }));
app.get(
  "/readyz",
  {
    config: {
      shouldSkipAuth: true,
    },
  },
  async () => ({ status: "ready" })
);

app.get(
  "/metrics",
  {
    config: {
      shouldSkipAuth: true,
    },
  },
  async (_req, reply) => {
    reply.header("Content-Type", metricsRegister.contentType);
    const metrics = await metricsRegister.metrics();
    return reply.send(metrics);
  }
);

app.addHook("onResponse", async (req, reply) => {
  try {
    const route = req.routeOptions.url || req.url;
    const method = req.method;
    const status = reply.statusCode;
    const durationSec = typeof (reply as any).elapsedTime === "number"
      ? (reply as any).elapsedTime / 1000
      : (reply.getResponseTime?.() ?? 0) / 1000;
    observeHttp({ method, route, status }, durationSec);
  } catch {}
});

export { app };
