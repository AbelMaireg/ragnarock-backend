import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsInt, IsString, Min } from "class-validator";
import { validateConfig } from "./validate-config";

class RedisEmailQueueEnvironmentVariables {
  @IsString()
  REDIS_URL = "redis://redis:6379";

  @IsString()
  EMAIL_QUEUE_STREAM = "stream:email:outgoing";

  @IsString()
  EMAIL_QUEUE_GROUP = "email-workers";

  @IsString()
  EMAIL_QUEUE_CONSUMER = "worker-1";

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  EMAIL_QUEUE_BATCH_SIZE = 10;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(100)
  EMAIL_QUEUE_BLOCK_MS = 5000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  EMAIL_QUEUE_MAX_RETRIES = 5;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1000)
  EMAIL_QUEUE_CLAIM_IDLE_MS = 30000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(10)
  EMAIL_QUEUE_STREAM_MAXLEN = 10000;
}

export default registerAs("redisEmailQueue", () => {
  const env = validateConfig(RedisEmailQueueEnvironmentVariables, process.env);

  return {
    redisUrl: env.REDIS_URL,
    stream: env.EMAIL_QUEUE_STREAM,
    group: env.EMAIL_QUEUE_GROUP,
    consumer: env.EMAIL_QUEUE_CONSUMER,
    batchSize: env.EMAIL_QUEUE_BATCH_SIZE,
    blockMs: env.EMAIL_QUEUE_BLOCK_MS,
    maxRetries: env.EMAIL_QUEUE_MAX_RETRIES,
    claimIdleMs: env.EMAIL_QUEUE_CLAIM_IDLE_MS,
    streamMaxLen: env.EMAIL_QUEUE_STREAM_MAXLEN,
    deadLetterStream: `${env.EMAIL_QUEUE_STREAM}:dlq`,
  };
});
