import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins/organization";
import { twoFactor } from "better-auth/plugins/two-factor";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for Better Auth CLI generation");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const oauthRedirectBase = (process.env.BETTER_AUTH_URL ?? "http://localhost:8000").replace(/\/$/, "");
const basePath = process.env.BETTER_AUTH_BASE_PATH ?? "/api/auth";

const cliSocialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          redirectURI: `${oauthRedirectBase}${basePath}/callback/google`,
        },
      }
    : {}),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          redirectURI: `${oauthRedirectBase}${basePath}/callback/github`,
        },
      }
    : {}),
};

export const auth: any = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "please-set-a-real-secret-with-32-plus-characters",
  // CLI/schema only; runtime app uses dynamic baseURL + BETTER_AUTH_URL for OAuth redirect base.
  baseURL: "http://main.localhost",
  basePath: process.env.BETTER_AUTH_BASE_PATH ?? "/api/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  ...(Object.keys(cliSocialProviders).length > 0 ? { socialProviders: cliSocialProviders } : {}),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github", "credential"],
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  plugins: [twoFactor(), organization({ teams: { enabled: true } }), admin(), bearer(), emailOTP()],
});

export default auth;
