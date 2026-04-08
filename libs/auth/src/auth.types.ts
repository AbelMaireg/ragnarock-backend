import type { betterAuth } from "better-auth";

export type AuthInstance = ReturnType<typeof betterAuth<any>>;
export type AuthSession = {
  session: Record<string, unknown>;
  user: Record<string, unknown>;
};
export type AuthUser = AuthSession["user"];

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    session?: AuthSession["session"];
  }
}
