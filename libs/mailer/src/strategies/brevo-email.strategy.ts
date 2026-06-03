import { Injectable, Logger } from "@nestjs/common";
import * as brevo from "@getbrevo/brevo";
import { SendEmailInput } from "../types/email.types";
import { EmailClientStrategy } from "./email-client.strategy";

interface BrevoConfig {
  apiKey: string;
}

@Injectable()
export class BrevoEmailStrategy implements EmailClientStrategy {
  private readonly logger = new Logger(BrevoEmailStrategy.name);
  private readonly api: brevo.TransactionalEmailsApi;

  constructor(config: BrevoConfig) {
    this.api = new brevo.TransactionalEmailsApi();
    this.api.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, config.apiKey);
  }

  async send(input: SendEmailInput): Promise<void> {
    const recipient = Array.isArray(input.to) ? input.to.join(",") : input.to;
    const payload = new brevo.SendSmtpEmail();
    payload.subject = input.subject;
    payload.htmlContent = input.html;
    payload.textContent = input.text;
    payload.to = this.toRecipients(input.to);
    payload.sender = input.from ? { email: input.from.email, name: input.from.name } : undefined;

    try {
      const response = await this.api.sendTransacEmail(payload);
      this.logger.log(
        `[Brevo success] to=${recipient} subject="${input.subject}" messageId=${response.body?.messageId ?? "unknown"}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `[Brevo failed] to=${recipient} subject="${input.subject}" error="${reason}"`,
      );
      throw error;
    }
  }

  private toRecipients(to: string | string[]): Array<{ email: string }> {
    const emails = Array.isArray(to) ? to : [to];
    return emails.map((email) => ({ email }));
  }
}
