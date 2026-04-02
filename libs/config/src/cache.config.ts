import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { validateConfig } from "./validate-config";

class CacheEnvironmentVariables {
  @IsString()
  REDIS_HOST = "redis";

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT = 6379;

  @IsString()
  @IsOptional()
  REDIS_USER?: string;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  REDIS_DB = 0;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  REDIS_TTL_SECONDS = 60;
}

export default registerAs("cache", () => {
  const env = validateConfig(CacheEnvironmentVariables, process.env);

  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    user: env.REDIS_USER,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    ttlSeconds: env.REDIS_TTL_SECONDS,
  };
});
