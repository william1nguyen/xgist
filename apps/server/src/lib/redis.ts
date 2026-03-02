import { Redis } from "ioredis"
import { env } from "@xgist/env/server"

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})
