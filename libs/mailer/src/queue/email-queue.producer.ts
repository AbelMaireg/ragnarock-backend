import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, RedisClientType } from "redis";
import { EnqueueTemplateEmailInput, QueuedEmailJob } from "./email-queue.types";

@Injectable()
export class EmailQueueProducer implements OnModuleDestroy {
  private readonly redisClient: RedisClientType;
  private readonly stream: string;
  private readonly streamMaxLen: number;

  constructor(private readonly configService: ConfigService) {
    this.stream = this.configService.getOrThrow<string>("redisEmailQueue.stream");
    this.streamMaxLen = this.configService.get<number>("redisEmailQueue.streamMaxLen", 10000);

    this.redisClient = createClient({
      url: this.configService.getOrThrow<string>("redisEmailQueue.redisUrl"),
    });
  }

  async enqueue(input: EnqueueTemplateEmailInput): Promise<string> {
    await this.ensureConnected();

    const job: QueuedEmailJob = {
      ...input,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    };

    const messageId = await this.redisClient.sendCommand<string>([
      "XADD",
      this.stream,
      "MAXLEN",
      "~",
      String(this.streamMaxLen),
      "*",
      "payload",
      JSON.stringify(job),
    ]);

    return messageId;
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
