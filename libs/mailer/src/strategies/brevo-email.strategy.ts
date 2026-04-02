import { Injectable } from "@nestjs/common";
import * as brevo from "@getbrevo/brevo";
import { SendEmailInput } from "../types/email.types";
import { EmailClientStrategy } from "./email-client.strategy";

interface BrevoConfig {
  apiKey: string;
}

@Injectable()
export class BrevoEmailStrategy implements EmailClientStrategy {
  private readonly api: brevo.TransactionalEmailsApi;

  constructor(config: BrevoConfig) {
    this.api = new brevo.TransactionalEmailsApi();
    this.api.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, config.apiKey);
  }

  async send(input: SendEmailInput): Promise<void> {
    const payload = new brevo.SendSmtpEmail();
    payload.subject = input.subject;
    payload.htmlContent = input.html;
    payload.textContent = input.text;
    payload.to = this.toRecipients(input.to);
    payload.sender = input.from ? { email: input.from.email, name: input.from.name } : undefined;

    await this.api.sendTransacEmail(payload);
  }

  private toRecipients(to: string | string[]): Array<{ email: string }> {
    const emails = Array.isArray(to) ? to : [to];
    return emails.map((email) => ({ email }));
  }
}
