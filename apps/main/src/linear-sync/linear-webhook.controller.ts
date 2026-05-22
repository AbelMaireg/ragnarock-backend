import { Body, Controller, Headers, HttpCode, Post } from "@nestjs/common";
import { LinearWebhookService } from "./services/linear-webhook.service";

/**
 * Public webhook endpoint (stub). Signature verification to be added when enabling webhooks.
 */
@Controller("webhooks")
export class LinearWebhookController {
  constructor(private readonly webhookService: LinearWebhookService) {}

  @Post("linear")
  @HttpCode(200)
  async handleLinearWebhook(
    @Body() body: Record<string, unknown>,
    @Headers("linear-signature") _signature?: string,
  ) {
    // TODO: verify LINEAR_WEBHOOK_SECRET against signature
    await this.webhookService.handleEvent(body);
    return { received: true };
  }
}
