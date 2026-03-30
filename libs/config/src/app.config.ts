import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, Max, Min } from "class-validator";
import { validateConfig } from "./validate-config";

enum NodeEnvironment {
  Development = "development",
  Test = "test",
  Production = "production",
}

class AppEnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  ADMIN_PORT = 3001;
}

export default registerAs("app", () => {
  const env = validateConfig(AppEnvironmentVariables, process.env);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    adminPort: env.ADMIN_PORT,
  };
});
