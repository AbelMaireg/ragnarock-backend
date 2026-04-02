import { registerAs } from "@nestjs/config";
import { IsEnum, IsString } from "class-validator";
import { validateConfig } from "./validate-config";

enum MailDriver {
  Nodemailer = "nodemailer",
  Brevo = "brevo",
}

class MailEnvironmentVariables {
  @IsEnum(MailDriver)
  MAIL_DRIVER: MailDriver = MailDriver.Nodemailer;

  @IsString()
  MAIL_FROM_EMAIL = "no-reply@example.com";

  @IsString()
  MAIL_FROM_NAME = "Makeup App";

  @IsString()
  MAIL_TEMPLATE_ROOT = "libs/mailer/src/templates/views";
}

export default registerAs("mail", () => {
  const env = validateConfig(MailEnvironmentVariables, process.env);

  return {
    driver: env.MAIL_DRIVER,
    fromEmail: env.MAIL_FROM_EMAIL,
    fromName: env.MAIL_FROM_NAME,
    templateRoot: env.MAIL_TEMPLATE_ROOT,
  };
});
