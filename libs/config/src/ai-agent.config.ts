import { registerAs } from "@nestjs/config";
import { IsOptional, IsString } from "class-validator";
import { validateConfig } from "./validate-config";

class AiAgentEnvironmentVariables {
  @IsOptional()
  @IsString()
  AI_AGENT_BASE_URL?: string;

  @IsOptional()
  @IsString()
  AI_AGENT_INTERNAL_API_KEY?: string;
}

export default registerAs("aiAgent", () => {
  const env = validateConfig(AiAgentEnvironmentVariables, process.env);
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const baseUrl = (env.AI_AGENT_BASE_URL ?? "").trim().replace(/\/$/, "");
  const internalApiKey = (env.AI_AGENT_INTERNAL_API_KEY ?? "").trim();

  if (nodeEnv === "production") {
    if (!baseUrl || !internalApiKey) {
      throw new Error(
        "AI_AGENT_BASE_URL and AI_AGENT_INTERNAL_API_KEY are required when NODE_ENV is production.",
      );
    }
  }

  return {
    baseUrl,
    internalApiKey,
    enabled: Boolean(baseUrl && internalApiKey),
  };
});
