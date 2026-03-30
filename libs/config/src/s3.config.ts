import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { validateConfig } from "./validate-config";

class S3EnvironmentVariables {
  @IsString()
  S3_REGION = "us-east-1";

  @IsString()
  S3_BUCKET = "";

  @IsString()
  S3_ACCESS_KEY_ID = "";

  @IsString()
  S3_SECRET_ACCESS_KEY = "";

  @IsString()
  @IsOptional()
  S3_ENDPOINT?: string;

  @Transform(({ value }) => value === "true")
  @IsBoolean()
  S3_FORCE_PATH_STYLE = false;
}

export default registerAs("s3", () => {
  const env = validateConfig(S3EnvironmentVariables, process.env);

  return {
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  };
});
