import { env } from "~/env";
import type { ConnectionOptions } from "bullmq";
import { Redis, type RedisOptions } from "ioredis";

const commonOptions = {
  connectTimeout: 500,
  maxRetriesPerRequest: 1,
};

const redisInstance = (db?: number, options?: RedisOptions) => {
  const customOptions = options ?? {};

  return new Redis(env.REDIS_URL ?? "", {
    ...commonOptions,
    db,
    ...customOptions,
  });
};

export const redisDefault = redisInstance();
export const redisForBullMq = redisInstance(env.BULL_REDIS_DB, {
  maxRetriesPerRequest: null,
});
