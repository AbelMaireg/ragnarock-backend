import { MailerService } from "@app/mailer";
import { PrismaService } from "@app/prisma";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins/organization";
import { twoFactor } from "better-auth/plugins/two-factor";
import { AuthSecondaryStorage } from "./redis/auth-redis.provider";

type AuthConfig = {
  secret: string;
  url: string;
  basePath: string;
  sessionExpiresInSeconds: number;
  sessionUpdateAgeSeconds: number;
  useSecureCookies: boolean;
  appName: string;
  emailOtp: {
    otpLength: number;
    expiresIn: number;
    allowedAttempts: number;
    resendStrategy: "rotate" | "reuse";
    sendVerificationOnSignUp: boolean;
    disableSignUp: boolean;
    storeOTP: "plain" | "encrypted" | "hashed";
    overrideDefaultEmailVerification: boolean;
    changeEmail: {
      enabled: boolean;
      verifyCurrentEmail: boolean;
    };
  };
};

export const createBetterAuthInstance = (
  config: AuthConfig,
  prismaService: PrismaService,
  secondaryStorage: AuthSecondaryStorage,
  mailerService: MailerService,
) => {
  return betterAuth({
    appName: config.appName,
    secret: config.secret,
    baseURL: config.url,
    basePath: config.basePath,
    trustedOrigins: [new URL(config.url).origin],
    database: prismaAdapter(prismaService, {
      provider: "postgresql",
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await mailerService.sendTemplate({
              to: user.email,
              subject: "Welcome",
              template: "welcome",
              context: {
                name: user.name ?? user.email,
              },
            });
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await mailerService.sendTemplate({
          to: user.email,
          subject: "Reset your password",
          template: "passwordReset",
          context: {
            url,
            userName: user.name ?? user.email,
          },
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await mailerService.sendTemplate({
          to: user.email,
          subject: "Verify your email",
          template: "emailVerification",
          context: {
            url,
            userName: user.name ?? user.email,
          },
        });
      },
    },
    session: {
      expiresIn: config.sessionExpiresInSeconds,
      updateAge: config.sessionUpdateAgeSeconds,
      cookieCache: {
        enabled: true,
      },
    },
    secondaryStorage,
    advanced: {
      useSecureCookies: config.useSecureCookies,
    },
    rateLimit: {
      enabled: true,
      storage: "secondary-storage",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": {
          window: 60,
          max: 10,
        },
        "/sign-up/email": {
          window: 60,
          max: 5,
        },
        "/forget-password": {
          window: 300,
          max: 3,
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: config.appName,
        otpOptions: {
          storeOTP: "encrypted",
          sendOTP: async ({ user, otp }) => {
            await mailerService.sendTemplate({
              to: user.email,
              subject: "Your verification code",
              template: "otpVerification",
              context: {
                otp,
                userName: user.name ?? user.email,
              },
            });
          },
        },
        backupCodeOptions: {
          storeBackupCodes: "encrypted",
        },
      }),
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 5,
        membershipLimit: 100,
        teams: {
          enabled: true,
        },
        sendInvitationEmail: async ({ email, inviter, organization, invitation }) => {
          await mailerService.sendTemplate({
            to: email,
            subject: `Invitation to join ${organization.name}`,
            template: "organizationInvitation",
            context: {
              url: invitation.id,
              organizationName: organization.name,
              inviterName: inviter.user.name ?? inviter.user.email,
            },
          });
        },
      }),
      admin(),
      bearer(),
      emailOTP({
        ...config.emailOtp,
        sendVerificationOTP: async ({ email, otp, type }) => {
          const subjectByType: Record<string, string> = {
            "sign-in": "Your sign-in verification code",
            "email-verification": "Your email verification code",
            "forget-password": "Your password reset verification code",
            "change-email": "Your change-email verification code",
          };
          await mailerService.sendTemplate({
            to: email,
            subject: subjectByType[type] ?? "Your verification code",
            template: "otpVerification",
            context: {
              otp,
              userName: email,
            },
          });
        },
      }),
    ],
  });
};
