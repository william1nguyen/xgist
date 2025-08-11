import { redisDefault } from "~/infra/redis";

export const getCache = async <T>(key: string): Promise<T | null> => {
  const raw = await redisDefault.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const setCache = async (key: string, value: unknown, ttlSeconds: number) => {
  const json = JSON.stringify(value);
  if (ttlSeconds > 0) {
    await redisDefault.set(key, json, "EX", ttlSeconds);
  } else {
    await redisDefault.set(key, json);
  }
};

export const getOrSetCache = async <T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> => {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  await setCache(key, value, ttlSeconds);
  return value;
};

export const invalidateByPattern = async (pattern: string) => {
  const keys = await redisDefault.keys(pattern);
  if (keys.length) {
    await redisDefault.del(keys);
  }
};


