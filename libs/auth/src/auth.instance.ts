import { MailerService } from "@app/mailer";
import { PrismaService } from "@app/prisma";
import type { TypesenseService } from "@app/typesense";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins/organization";
import { twoFactor } from "better-auth/plugins/two-factor";
import { AuthSecondaryStorage } from "./redis/auth-redis.provider";
import { openAPI } from "better-auth/plugins";

/** `url` is the fallback base (see BETTER_AUTH_URL); per-request host uses Better Auth dynamic baseURL. */
type AuthConfig = {
  secret: string;
  url: string;
  /** Browser-facing app URL for invitation email links (not the API base). */
  publicAppUrl: string;
  basePath: string;
  sessionExpiresInSeconds: number;
  sessionUpdateAgeSeconds: number;
  useSecureCookies: boolean;
  /** Origins allowed to make CSRF-protected calls (frontend apps). */
  trustedOrigins: string[];
  /** Parent domain to share cookies across subdomains (e.g. "localhost" or "example.com"). */
  cookieDomain?: string;
  /** Force SameSite=None; Secure cookies (required for cross-site XHR). */
  crossSiteCookies: boolean;
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
  typesenseService: TypesenseService,
) => {
  return betterAuth({
    appName: config.appName,
    secret: config.secret,
    baseURL: {
      allowedHosts: [
        "main.localhost",
        "admin.localhost",
        "localhost:3000",
        "localhost:3001",
        "127.0.0.1:3000",
        "127.0.0.1:3001",
      ],
      fallback: config.url,
      protocol: "http",
    },
    basePath: config.basePath,
    trustedOrigins: config.trustedOrigins,
    database: prismaAdapter(prismaService, {
      provider: "postgresql",
    }),
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
      // OTP flow handles signup verification; disable link-based signup verification emails.
      sendOnSignUp: false,
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
      ...(config.cookieDomain
        ? {
            crossSubDomainCookies: {
              enabled: true,
              domain: config.cookieDomain,
            },
          }
        : {}),
      ...(config.crossSiteCookies
        ? {
            defaultCookieAttributes: {
              sameSite: "none" as const,
              secure: true,
              httpOnly: true,
            },
          }
        : {}),
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
          const base = config.publicAppUrl.replace(/\/$/, "");
          const acceptUrl = `${base}/dashboard/accept-invitation?id=${encodeURIComponent(invitation.id)}`;
          await mailerService.sendTemplate({
            to: email,
            subject: `Invitation to join ${organization.name}`,
            template: "organizationInvitation",
            context: {
              url: acceptUrl,
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
        // Ensure signup triggers OTP delivery for verification flow.
        sendVerificationOnSignUp: true,
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
      openAPI(),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await typesenseService.upsertUser(user);
          },
        },
        update: {
          after: async (user) => {
            await typesenseService.upsertUser(user);
          },
        },
      },
    },
  });
};
