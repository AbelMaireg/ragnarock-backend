import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsString, Max, Min } from "class-validator";
import { validateConfig } from "./validate-config";

class DatabaseEnvironmentVariables {
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

  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
    ssl: env.DB_SSL,
  };
});
