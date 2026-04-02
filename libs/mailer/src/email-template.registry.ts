export const EMAIL_TEMPLATE_REGISTRY = {
  welcome: "welcome.hbs",
  passwordReset: "password-reset.hbs",
} as const;

export type EmailTemplate = keyof typeof EMAIL_TEMPLATE_REGISTRY;
