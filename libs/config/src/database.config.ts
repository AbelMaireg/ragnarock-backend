import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { validateConfig } from "./validate-config";

class DatabaseEnvironmentVariables {
  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  DB_HOST = "localhost";

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT = 5432;

  @IsString()
  DB_USER = "postgres";

  @IsString()
  DB_PASSWORD = "postgres";

  @IsString()
  DB_NAME = "app";

  @Transform(({ value }) => value === "true")
  @IsBoolean()
  DB_SSL = false;
}

export default registerAs("database", () => {
  const env = validateConfig(DatabaseEnvironmentVariables, process.env);
  const databaseUrl =
    env.DATABASE_URL ??
    `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}?schema=public`;

  return {
    url: databaseUrl,
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
    ssl: env.DB_SSL,
  };
});
