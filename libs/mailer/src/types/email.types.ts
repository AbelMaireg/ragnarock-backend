export type EmailAddress = string | string[];

export interface MailRecipient {
  email: string;
  name?: string;
}

export interface MailSender {
  email: string;
  name?: string;
}

export interface SendEmailInput {
  to: EmailAddress;
  subject: string;
  html: string;
  text?: string;
  from?: MailSender;
}

export interface SendTemplateEmailInput<TemplateContext = Record<string, unknown>> {
  to: EmailAddress;
  subject: string;
  template: string;
  context: TemplateContext;
  from?: MailSender;
}
