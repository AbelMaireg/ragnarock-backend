import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "./mailer.service";
import { EMAIL_CLIENT_STRATEGY } from "./mailer.tokens";
import { BrevoEmailStrategy } from "./strategies/brevo-email.strategy";
import { EmailClientStrategy } from "./strategies/email-client.strategy";
import { NodemailerEmailStrategy } from "./strategies/nodemailer-email.strategy";
import { TemplateRendererService } from "./templates/template-renderer.service";
import { EmailQueueProducer } from "./queue/email-queue.producer";
import { EmailQueueConsumer } from "./queue/email-queue.consumer";

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_CLIENT_STRATEGY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): EmailClientStrategy => {
        const driver = configService.get<"nodemailer" | "brevo">("mail.driver", "nodemailer");

        if (driver === "nodemailer") {
          return new NodemailerEmailStrategy({
            host: configService.getOrThrow<string>("nodemailer.host"),
            port: configService.getOrThrow<number>("nodemailer.port"),
            secure: configService.get<boolean>("nodemailer.secure", false),
            user: configService.get<string>("nodemailer.user"),
            password: configService.get<string>("nodemailer.password"),
          });
        }

        if (driver === "brevo") {
          return new BrevoEmailStrategy({
            apiKey: configService.getOrThrow<string>("brevo.apiKey"),
          });
        }

        throw new Error(`Unsupported email driver: ${driver}`);
      },
    },
    TemplateRendererService,
    EmailQueueProducer,
    EmailQueueConsumer,
    MailerService,
  ],
  exports: [MailerService],
})
export class MailerModule {}
