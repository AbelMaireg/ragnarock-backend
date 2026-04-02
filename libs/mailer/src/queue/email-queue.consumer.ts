import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, RedisClientType } from "redis";
import { EMAIL_CLIENT_STRATEGY } from "../mailer.tokens";
import { EmailClientStrategy } from "../strategies/email-client.strategy";
import { TemplateRendererService } from "../templates/template-renderer.service";
import { SendEmailInput } from "../types/email.types";
import { EMAIL_TEMPLATE_REGISTRY } from "../email-template.registry";
import { QueuedEmailJob } from "./email-queue.types";

@Injectable()
export class EmailQueueConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly redisClient: RedisClientType;
  private readonly stream: string;
  private readonly group: string;
  private readonly consumer: string;
  private readonly blockMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly claimIdleMs: number;
  private readonly deadLetterStream: string;
  private running = false;
  private loopPromise?: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateRendererService: TemplateRendererService,
    @Inject(EMAIL_CLIENT_STRATEGY)
    private readonly emailStrategy: EmailClientStrategy,
  ) {
    this.stream = this.configService.getOrThrow<string>("redisEmailQueue.stream");
    this.group = this.configService.getOrThrow<string>("redisEmailQueue.group");
    this.consumer = this.configService.getOrThrow<string>("redisEmailQueue.consumer");
    this.blockMs = this.configService.get<number>("redisEmailQueue.blockMs", 5000);
    this.batchSize = this.configService.get<number>("redisEmailQueue.batchSize", 10);
    this.maxRetries = this.configService.get<number>("redisEmailQueue.maxRetries", 5);
    this.claimIdleMs = this.configService.get<number>("redisEmailQueue.claimIdleMs", 30000);
    this.deadLetterStream = this.configService.getOrThrow<string>(
      "redisEmailQueue.deadLetterStream",
    );

    this.redisClient = createClient({
      url: this.configService.getOrThrow<string>("redisEmailQueue.redisUrl"),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureConnected();
    await this.ensureConsumerGroup();
    this.running = true;
    this.loopPromise = this.consumeLoop();
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    await this.loopPromise;
    if (this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
  }

  private async consumeLoop(): Promise<void> {
    while (this.running) {
      await this.claimStaleMessages();
      const messages = await this.readGroupMessages();

      for (const message of messages) {
        await this.processMessage(message.id, message.payload);
      }
    }
  }

  private async processMessage(messageId: string, payload: string): Promise<void> {
    const job = JSON.parse(payload) as QueuedEmailJob;

    try {
      const templatePath =
        EMAIL_TEMPLATE_REGISTRY[job.template as keyof typeof EMAIL_TEMPLATE_REGISTRY];
      if (!templatePath) {
        throw new Error(`Unknown email template: ${job.template}`);
      }

      const html = await this.templateRendererService.render(templatePath, job.context);
      const sendInput: SendEmailInput = {
        to: job.to,
        subject: job.subject,
        html,
        from: job.from,
      };

      await this.emailStrategy.send(sendInput);
      await this.redisClient.sendCommand(["XACK", this.stream, this.group, messageId]);
    } catch (error) {
      await this.handleFailure(messageId, job, error);
    }
  }

  private async handleFailure(
    messageId: string,
    job: QueuedEmailJob,
    error: unknown,
  ): Promise<void> {
    const nextAttempts = job.attempts + 1;
    const reason = error instanceof Error ? error.message : "Unknown error";

    if (nextAttempts > this.maxRetries) {
      await this.redisClient.sendCommand([
        "XADD",
        this.deadLetterStream,
        "*",
        "payload",
        JSON.stringify({
          ...job,
          attempts: nextAttempts,
          lastError: reason,
          failedAt: new Date().toISOString(),
          originalMessageId: messageId,
        }),
      ]);
      await this.redisClient.sendCommand(["XACK", this.stream, this.group, messageId]);
      return;
    }

    await this.redisClient.sendCommand([
      "XADD",
      this.stream,
      "*",
      "payload",
      JSON.stringify({
        ...job,
        attempts: nextAttempts,
        lastError: reason,
      }),
    ]);
    await this.redisClient.sendCommand(["XACK", this.stream, this.group, messageId]);
  }

  private async readGroupMessages(): Promise<Array<{ id: string; payload: string }>> {
    const raw = await this.redisClient.sendCommand<unknown>([
      "XREADGROUP",
      "GROUP",
      this.group,
      this.consumer,
      "COUNT",
      String(this.batchSize),
      "BLOCK",
      String(this.blockMs),
      "STREAMS",
      this.stream,
      ">",
    ]);

    return this.parseReadGroupResponse(raw);
  }

  private async claimStaleMessages(): Promise<void> {
    const raw = await this.redisClient.sendCommand<unknown>([
      "XAUTOCLAIM",
      this.stream,
      this.group,
      this.consumer,
      String(this.claimIdleMs),
      "0-0",
      "COUNT",
      String(this.batchSize),
    ]);

    const claimed = this.parseAutoClaimResponse(raw);
    for (const item of claimed) {
      await this.processMessage(item.id, item.payload);
    }
  }

  private parseReadGroupResponse(raw: unknown): Array<{ id: string; payload: string }> {
    if (!Array.isArray(raw) || raw.length === 0) {
      return [];
    }

    const firstStream = raw[0] as unknown[];
    if (!Array.isArray(firstStream) || firstStream.length < 2) {
      return [];
    }

    const entries = firstStream[1] as unknown[];
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .map((entry) => this.parseStreamEntry(entry))
      .filter((entry): entry is { id: string; payload: string } => entry !== null);
  }

  private parseAutoClaimResponse(raw: unknown): Array<{ id: string; payload: string }> {
    if (!Array.isArray(raw) || raw.length < 2) {
      return [];
    }

    const entries = raw[1] as unknown[];
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .map((entry) => this.parseStreamEntry(entry))
      .filter((entry): entry is { id: string; payload: string } => entry !== null);
  }

  private parseStreamEntry(entry: unknown): { id: string; payload: string } | null {
    if (!Array.isArray(entry) || entry.length < 2) {
      return null;
    }

    const id = entry[0];
    const fields = entry[1];
    if (typeof id !== "string" || !Array.isArray(fields)) {
      return null;
    }

    for (let index = 0; index < fields.length; index += 2) {
      const key = fields[index];
      const value = fields[index + 1];
      if (key === "payload" && typeof value === "string") {
        return { id, payload: value };
      }
    }

    return null;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
  }

  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.redisClient.sendCommand([
        "XGROUP",
        "CREATE",
        this.stream,
        this.group,
        "0",
        "MKSTREAM",
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("BUSYGROUP")) {
        throw error;
      }
    }
  }
}
