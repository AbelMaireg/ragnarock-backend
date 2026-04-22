import { registerAs } from "@nestjs/config";

export default registerAs("integrations", () => ({
  /** Used to derive AES-256-GCM key for integration tokens (set in production). */
  credentialsSecret: process.env.INTEGRATIONS_CREDENTIALS_SECRET ?? "",
}));
