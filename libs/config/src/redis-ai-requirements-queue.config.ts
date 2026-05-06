import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsInt, IsString, Min } from "class-validator";
import { validateConfig } from "./validate-config";

class RedisAiRequirementsQueueEnvironmentVariables {
  @IsString()
  REDIS_URL = "redis://redis:6379";

  @IsString()
  AI_REQUIREMENTS_QUEUE_JOBS_STREAM = "stream:ai-requirements:jobs";

  @IsString()
  AI_REQUIREMENTS_QUEUE_RESULTS_STREAM = "stream:ai-requirements:results";

  @IsString()
  AI_REQUIREMENTS_QUEUE_RESULTS_GROUP = "ai-requirements-result-workers";

  @IsString()
  AI_REQUIREMENTS_QUEUE_RESULTS_CONSUMER = "backend-1";

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  AI_REQUIREMENTS_QUEUE_BATCH_SIZE = 10;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(100)
  AI_REQUIREMENTS_QUEUE_BLOCK_MS = 5000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  AI_REQUIREMENTS_QUEUE_MAX_RETRIES = 5;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1000)
  AI_REQUIREMENTS_QUEUE_CLAIM_IDLE_MS = 30000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(10)
  AI_REQUIREMENTS_QUEUE_STREAM_MAXLEN = 10000;
}

export default registerAs("redisAiRequirementsQueue", () => {
  const env = validateConfig(RedisAiRequirementsQueueEnvironmentVariables, process.env);

  return {
    redisUrl: env.REDIS_URL,
    jobsStream: env.AI_REQUIREMENTS_QUEUE_JOBS_STREAM,
    resultsStream: env.AI_REQUIREMENTS_QUEUE_RESULTS_STREAM,
    resultsGroup: env.AI_REQUIREMENTS_QUEUE_RESULTS_GROUP,
    resultsConsumer: env.AI_REQUIREMENTS_QUEUE_RESULTS_CONSUMER,
    batchSize: env.AI_REQUIREMENTS_QUEUE_BATCH_SIZE,
    blockMs: env.AI_REQUIREMENTS_QUEUE_BLOCK_MS,
    maxRetries: env.AI_REQUIREMENTS_QUEUE_MAX_RETRIES,
    claimIdleMs: env.AI_REQUIREMENTS_QUEUE_CLAIM_IDLE_MS,
    streamMaxLen: env.AI_REQUIREMENTS_QUEUE_STREAM_MAXLEN,
    jobsDeadLetterStream: `${env.AI_REQUIREMENTS_QUEUE_JOBS_STREAM}:dlq`,
    resultsDeadLetterStream: `${env.AI_REQUIREMENTS_QUEUE_RESULTS_STREAM}:dlq`,
  };
});
