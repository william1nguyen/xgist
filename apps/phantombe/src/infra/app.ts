import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import fastify from "fastify";
import { videoModule } from "~/domain/video/video.module";
import { env } from "~/env";
import { bullBoardPlugin } from "./bullboard";
import { queues } from "./jobs";

const app = fastify({ logger: true });

app.register(fastifyCors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

app.register(fastifyMultipart, {
  attachFieldsToBody: true,
  limits: {
    fieldNameSize: 100,
    fieldSize: 100,
    fields: 10,
    fileSize: 21048576,
    files: 1,
    headerPairs: 2000,
    parts: 1000,
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
app.register(videoModule);

export { app };
