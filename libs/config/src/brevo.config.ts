import { registerAs } from "@nestjs/config";
import { IsString } from "class-validator";
import { validateConfig } from "./validate-config";

class BrevoEnvironmentVariables {
  @IsString()
  BREVO_API_KEY = "";
}

export default registerAs("brevo", () => {
  const env = validateConfig(BrevoEnvironmentVariables, process.env);

  return {
    apiKey: env.BREVO_API_KEY,
  };
});
