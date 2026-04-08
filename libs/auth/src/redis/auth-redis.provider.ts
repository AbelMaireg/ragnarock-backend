import { ConfigService } from "@nestjs/config";
import { RedisClientType, createClient } from "redis";

export type AuthSecondaryStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

export const createAuthRedisClient = (configService: ConfigService): RedisClientType => {
  const host = configService.getOrThrow<string>("cache.host");
  const port = configService.getOrThrow<number>("cache.port");
  const user = configService.get<string>("cache.user");
  const password = configService.get<string>("cache.password");
  const db = configService.get<number>("cache.db", 0);

  return createClient({
    socket: {
      host,
      port,
    },
    username: user,
    password,
    database: db,
  });
};

export const createAuthSecondaryStorage = (redisClient: RedisClientType): AuthSecondaryStorage => ({
  get: async (key: string) => {
    await ensureConnected(redisClient);
    return redisClient.get(key);
  },
  set: async (key: string, value: string, ttl?: number) => {
    await ensureConnected(redisClient);
    if (ttl && ttl > 0) {
      await redisClient.set(key, value, {
        EX: ttl,
      });
      return;
    }
    await redisClient.set(key, value);
  },
  delete: async (key: string) => {
    await ensureConnected(redisClient);
    await redisClient.del(key);
  },
});

const ensureConnected = async (redisClient: RedisClientType): Promise<void> => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};
