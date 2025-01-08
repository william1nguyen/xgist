import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import fastify, { type FastifyInstance } from "fastify";
import { execSecurityHandlerChain } from "~/domain/user/security-plugin/plugin";
import { userModule } from "~/domain/user/user.module";
import { videoModule } from "~/domain/video/video.module";
import { env } from "~/env";

const app: FastifyInstance = fastify({ logger: true });

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

app.addHook("preHandler", execSecurityHandlerChain);

if (env.NODE_ENV !== "production") {
  app.register(swagger, {
    mode: "dynamic",
    swagger: {
      info: {
        title: "API Documentation",
        version: "1.0.0",
      },
      consumes: ["application/json", "multipart/form-data"],
      produces: ["application/json"],
    },
  });

  app.register(scalar, { routePrefix: "/api-reference" });
}

app.register(userModule);
app.register(videoModule);

export { app };
