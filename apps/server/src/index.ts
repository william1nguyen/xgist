import fastifyCors from "@fastify/cors"
import { onError } from "@orpc/server"
import { RPCHandler } from "@orpc/server/fastify"
import { createContext } from "@xgist/api/context"
import { appRouter } from "@xgist/api/routers/index"
import { auth } from "@xgist/auth"
import { env } from "@xgist/env/server"
import Fastify from "fastify"

import { initBuckets, minioClient } from "./lib/minio"
import { redis } from "./lib/redis"
import { startResultConsumer } from "./lib/result-consumer"
import { polarWebhookRoute } from "./routes/polar-webhook"

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

const fastify = Fastify({ logger: true })

fastify.register(fastifyCors, {
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
})

fastify.register(async (rpcApp) => {
  rpcApp.addContentTypeParser("*", (_, _payload, done) => {
    done(null, undefined)
  })

  rpcApp.all("/rpc/*", async (request, reply) => {
    const { matched } = await rpcHandler.handle(request, reply, {
      context: await createContext(request.headers, redis, minioClient),
      prefix: "/rpc",
    })
    if (!matched) reply.status(404).send()
  })
})

fastify.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    const url = new URL(request.url, `http://${request.headers.host}`)
    const headers = new Headers()
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) headers.append(key, Array.isArray(value) ? value.join(", ") : value)
    }
    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    })
    const response = await auth.handler(req)
    reply.status(response.status)
    response.headers.forEach((value, key) => reply.header(key, value))
    reply.send(response.body ? await response.text() : null)
  },
})

fastify.register(polarWebhookRoute)

fastify.get("/", async () => "OK")

const start = async () => {
  await initBuckets()
  startResultConsumer(redis)
  await fastify.listen({ port: 3000, host: "0.0.0.0" })
}

start().catch((err) => {
  fastify.log.error(err)
  process.exit(1)
})
