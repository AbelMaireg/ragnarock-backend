import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsInt, IsString, Max, Min } from "class-validator";
import { validateConfig } from "./validate-config";

class TypesenseEnvironmentVariables {
  @IsString()
  TYPESENSE_HOST = "typesense";

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  TYPESENSE_PORT = 8108;

  @IsString()
  TYPESENSE_PROTOCOL = "http";

  @IsString()
  TYPESENSE_API_KEY!: string;
}

export default registerAs("typesense", () => {
  const env = validateConfig(TypesenseEnvironmentVariables, process.env);

  return {
    host: env.TYPESENSE_HOST,
    port: env.TYPESENSE_PORT,
    protocol: env.TYPESENSE_PROTOCOL,
    apiKey: env.TYPESENSE_API_KEY,
  };
});
