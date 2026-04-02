import { MailSender } from "../types/email.types";

export interface EnqueueTemplateEmailInput {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
  from?: MailSender;
}

export interface QueuedEmailJob extends EnqueueTemplateEmailInput {
  attempts: number;
  lastError?: string;
  queuedAt: string;
}
