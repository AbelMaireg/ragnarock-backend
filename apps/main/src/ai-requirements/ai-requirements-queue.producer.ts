import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, RedisClientType } from "redis";
import {
  AiArchDocQueuedJob,
  AiPlannerQueuedJob,
  AiQaIntelligenceQueuedJob,
  AiRequirementsQueuedJob,
  RagnarockChatQueuedJob,
} from "./ai-requirements-queue.types";

@Injectable()
export class AiRequirementsQueueProducer implements OnModuleDestroy {
  private readonly redisClient: RedisClientType;
  private readonly jobsStream: string;
  private readonly streamMaxLen: number;

  constructor(private readonly configService: ConfigService) {
    this.jobsStream = this.configService.getOrThrow<string>("redisAiRequirementsQueue.jobsStream");
    this.streamMaxLen = this.configService.get<number>(
      "redisAiRequirementsQueue.streamMaxLen",
      10000,
    );

    this.redisClient = createClient({
      url: this.configService.getOrThrow<string>("redisAiRequirementsQueue.redisUrl"),
    });
  }

  async enqueue(job: AiRequirementsQueuedJob): Promise<string> {
    return this.push(job);
  }

  async enqueueArchDoc(job: AiArchDocQueuedJob): Promise<string> {
    return this.push(job);
  }

  async enqueuePlanner(job: AiPlannerQueuedJob): Promise<string> {
    return this.push(job);
  }

  async enqueueQaIntelligence(job: AiQaIntelligenceQueuedJob): Promise<string> {
    return this.push(job);
  }

  async enqueueRagnarockChat(job: RagnarockChatQueuedJob): Promise<string> {
    return this.push(job);
  }

  private async push(
    job:
      | AiRequirementsQueuedJob
      | AiArchDocQueuedJob
      | AiPlannerQueuedJob
      | AiQaIntelligenceQueuedJob
      | RagnarockChatQueuedJob,
  ): Promise<string> {
    await this.ensureConnected();

    return this.redisClient.sendCommand<string>([
      "XADD",
      this.jobsStream,
      "MAXLEN",
      "~",
      String(this.streamMaxLen),
      "*",
      "payload",
      JSON.stringify(job),
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
  }
}
