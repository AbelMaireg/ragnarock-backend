import { Injectable, Logger } from "@nestjs/common";

/** Placeholder for future Linear webhook processing. */
@Injectable()
export class LinearWebhookService {
  private readonly logger = new Logger(LinearWebhookService.name);

  async handleEvent(payload: Record<string, unknown>): Promise<void> {
    const action = typeof payload.action === "string" ? payload.action : "unknown";
    this.logger.debug(`Linear webhook received (stub): action=${action}`);
    // Future: verify signature, enqueue sync job
  }
}
