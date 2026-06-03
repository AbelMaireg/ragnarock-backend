import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import { SendEmailInput } from "../types/email.types";
import { EmailClientStrategy } from "./email-client.strategy";

interface NodemailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

@Injectable()
export class NodemailerEmailStrategy implements EmailClientStrategy {
  private readonly logger = new Logger(NodemailerEmailStrategy.name);
  private readonly transporter: Transporter;

  constructor(config: NodemailerConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    const recipient = Array.isArray(input.to) ? input.to.join(",") : input.to;

    try {
      const info = await this.transporter.sendMail({
        from: input.from
          ? `"${input.from.name ?? input.from.email}" <${input.from.email}>`
          : undefined,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      this.logger.log(
        `[SMTP success] to=${recipient} subject="${input.subject}" messageId=${info.messageId ?? "unknown"} response="${info.response ?? ""}"`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `[SMTP failed] to=${recipient} subject="${input.subject}" error="${reason}"`,
      );
      throw error;
    }
  }
}
