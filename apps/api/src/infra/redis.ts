import { Redis, type RedisOptions } from "ioredis";
import { env } from "~/env";

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
