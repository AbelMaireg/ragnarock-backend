import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { validateConfig } from "./validate-config";

class NodemailerEnvironmentVariables {
  @IsString()
  NODEMAILER_HOST = "localhost";

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  NODEMAILER_PORT = 1025;

  @Transform(({ value }) => value === "true")
  @IsBoolean()
  NODEMAILER_SECURE = false;

  @IsString()
  @IsOptional()
  NODEMAILER_USER?: string;

  @IsString()
  @IsOptional()
  NODEMAILER_PASSWORD?: string;
}

export default registerAs("nodemailer", () => {
  const env = validateConfig(NodemailerEnvironmentVariables, process.env);

  return {
    host: env.NODEMAILER_HOST,
    port: env.NODEMAILER_PORT,
    secure: env.NODEMAILER_SECURE,
    user: env.NODEMAILER_USER,
    password: env.NODEMAILER_PASSWORD,
  };
});
