import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "@app/logger";
import { createClient, RedisClientType } from "redis";
import { AiChatTurnService } from "./ai-chat-turn.service";
import { AiArchDocService } from "./ai-arch-doc.service";
import { AiArchDocResultEvent, AiRequirementsResultEvent } from "./ai-requirements-queue.types";

@Injectable()
export class AiRequirementsResultConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly redisClient: RedisClientType;
  private readonly resultsStream: string;
  private readonly resultsGroup: string;
  private readonly resultsConsumer: string;
  private readonly blockMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly claimIdleMs: number;
  private readonly deadLetterStream: string;
  private running = false;
  private loopPromise?: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly turnService: AiChatTurnService,
    private readonly archDocService: AiArchDocService,
    private readonly logger: LoggerService,
  ) {
    this.resultsStream = this.configService.getOrThrow<string>(
      "redisAiRequirementsQueue.resultsStream",
    );
    this.resultsGroup = this.configService.getOrThrow<string>(
      "redisAiRequirementsQueue.resultsGroup",
    );
    this.resultsConsumer = this.configService.getOrThrow<string>(
      "redisAiRequirementsQueue.resultsConsumer",
    );
    this.blockMs = this.configService.get<number>("redisAiRequirementsQueue.blockMs", 5000);
    this.batchSize = this.configService.get<number>("redisAiRequirementsQueue.batchSize", 10);
    this.maxRetries = this.configService.get<number>("redisAiRequirementsQueue.maxRetries", 5);
    this.claimIdleMs = this.configService.get<number>(
      "redisAiRequirementsQueue.claimIdleMs",
      30000,
    );
    this.deadLetterStream = this.configService.getOrThrow<string>(
      "redisAiRequirementsQueue.resultsDeadLetterStream",
    );

    this.redisClient = createClient({
      url: this.configService.getOrThrow<string>("redisAiRequirementsQueue.redisUrl"),
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
    let result: AiRequirementsResultEvent | AiArchDocResultEvent;

    try {
      result = JSON.parse(payload) as AiRequirementsResultEvent | AiArchDocResultEvent;
    } catch (error) {
      await this.sendToDeadLetter(messageId, payload, error);
      await this.ack(messageId);
      return;
    }

    try {
      if (result.status === "arch_doc_succeeded" || result.status === "arch_doc_failed") {
        await this.archDocService.completeGeneration(result as AiArchDocResultEvent);
      } else if (result.status === "succeeded") {
        await this.turnService.completeQueuedTurn({
          projectId: result.projectId,
          userId: result.userId,
          sessionId: result.sessionId,
          userMessageId: result.userMessageId,
          raw: result.response,
        });
      } else {
        this.turnService.failQueuedTurn({
          projectId: result.projectId,
          sessionId: result.sessionId,
          userMessageId: result.userMessageId,
          jobId: result.jobId,
          error: result.error,
        });
      }

      await this.ack(messageId);
    } catch (error) {
      await this.handleProcessingFailure(messageId, result as AiRequirementsResultEvent, error);
    }
  }

  private async handleProcessingFailure(
    messageId: string,
    result: AiRequirementsResultEvent,
    error: unknown,
  ): Promise<void> {
    const nextAttempts = (result.attempts ?? 0) + 1;
    const reason = error instanceof Error ? error.message : "Unknown error";

    if (nextAttempts > this.maxRetries) {
      await this.sendToDeadLetter(messageId, JSON.stringify(result), error);
      if (result.status === "succeeded") {
        this.turnService.failQueuedTurn({
          projectId: result.projectId,
          sessionId: result.sessionId,
          userMessageId: result.userMessageId,
          jobId: result.jobId,
          error: reason,
        });
      }
      await this.ack(messageId);
      return;
    }

    await this.redisClient.sendCommand([
      "XADD",
      this.resultsStream,
      "*",
      "payload",
      JSON.stringify({
        ...result,
        attempts: nextAttempts,
        lastError: reason,
      }),
    ]);
    await this.ack(messageId);
  }

  private async readGroupMessages(): Promise<Array<{ id: string; payload: string }>> {
    const raw = await this.redisClient.sendCommand<unknown>([
      "XREADGROUP",
      "GROUP",
      this.resultsGroup,
      this.resultsConsumer,
      "COUNT",
      String(this.batchSize),
      "BLOCK",
      String(this.blockMs),
      "STREAMS",
      this.resultsStream,
      ">",
    ]);

    return this.parseReadGroupResponse(raw);
  }

  private async claimStaleMessages(): Promise<void> {
    const raw = await this.redisClient.sendCommand<unknown>([
      "XAUTOCLAIM",
      this.resultsStream,
      this.resultsGroup,
      this.resultsConsumer,
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

  private async sendToDeadLetter(
    messageId: string,
    payload: string,
    error: unknown,
  ): Promise<void> {
    const reason = error instanceof Error ? error.message : "Unknown error";

    this.logger.warn(
      `AI requirements result moved to DLQ: ${messageId} - ${reason}`,
      AiRequirementsResultConsumer.name,
    );
    await this.redisClient.sendCommand([
      "XADD",
      this.deadLetterStream,
      "*",
      "payload",
      payload,
      "originalMessageId",
      messageId,
      "error",
      reason,
    ]);
  }

  private async ack(messageId: string): Promise<void> {
    await this.redisClient.sendCommand(["XACK", this.resultsStream, this.resultsGroup, messageId]);
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
        this.resultsStream,
        this.resultsGroup,
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
