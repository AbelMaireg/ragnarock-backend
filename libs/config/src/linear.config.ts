import { registerAs } from "@nestjs/config";

export default registerAs("linear", () => ({
  apiUrl: process.env.LINEAR_API_URL ?? "https://api.linear.app/graphql",
  /** Optional server-side fallback PAT (dev only; production uses org IntegrationConnection). */
  apiKey: process.env.LINEAR_API_KEY ?? "",
  syncEnabled: process.env.LINEAR_SYNC_ENABLED === "true",
  syncCron: process.env.LINEAR_SYNC_CRON ?? "*/15 * * * *",
  syncBatchSize: Number.parseInt(process.env.LINEAR_SYNC_BATCH_SIZE ?? "25", 10) || 25,
}));
