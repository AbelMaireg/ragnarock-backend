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

export const auth: any = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "please-set-a-real-secret-with-32-plus-characters",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  basePath: process.env.BETTER_AUTH_BASE_PATH ?? "/api/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  plugins: [twoFactor(), organization({ teams: { enabled: true } }), admin(), bearer(), emailOTP()],
});

export default auth;
