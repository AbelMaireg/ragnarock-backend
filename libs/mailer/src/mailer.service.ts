import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailTemplate } from "./email-template.registry";
import { EmailQueueProducer } from "./queue/email-queue.producer";
import { MailSender, SendTemplateEmailInput } from "./types/email.types";

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailQueueProducer: EmailQueueProducer,
  ) {}

  async sendTemplate<TContext extends Record<string, unknown>>(
    input: Omit<SendTemplateEmailInput<TContext>, "template"> & { template: EmailTemplate },
  ): Promise<string> {
    const defaultSender: MailSender = {
      email: this.configService.getOrThrow<string>("mail.fromEmail"),
      name: this.configService.get<string>("mail.fromName"),
    };

    const queueMessageId = await this.emailQueueProducer.enqueue({
      to: input.to,
      subject: input.subject,
      template: input.template,
      context: input.context,
      from: input.from ?? defaultSender,
    });

    this.logger.log(
      `[Email queued] to=${this.formatRecipient(input.to)} subject="${input.subject}" template=${input.template} queueId=${queueMessageId}`,
    );

    return queueMessageId;
  }

  private formatRecipient(to: string | string[]): string {
    return Array.isArray(to) ? to.join(",") : to;
  }
}
