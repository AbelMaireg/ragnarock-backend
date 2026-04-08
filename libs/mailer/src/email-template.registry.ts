export const EMAIL_TEMPLATE_REGISTRY = {
  welcome: "welcome.hbs",
  passwordReset: "password-reset.hbs",
  emailVerification: "email-verification.hbs",
  otpVerification: "otp-verification.hbs",
  organizationInvitation: "organization-invitation.hbs",
} as const;

export type EmailTemplate = keyof typeof EMAIL_TEMPLATE_REGISTRY;
