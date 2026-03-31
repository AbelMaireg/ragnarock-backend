import { registerAs } from "@nestjs/config";
import { IsEnum, IsString } from "class-validator";
import { validateConfig } from "./validate-config";

enum FilesystemDriver {
  Local = "local",
  S3 = "s3",
}

class FilesystemEnvironmentVariables {
  @IsEnum(FilesystemDriver)
  FILESYSTEM_DRIVER: FilesystemDriver = FilesystemDriver.Local;

  @IsString()
  LOCAL_STORAGE_ROOT = "uploads";
}

export default registerAs("filesystem", () => {
  const env = validateConfig(FilesystemEnvironmentVariables, process.env);

  return {
    driver: env.FILESYSTEM_DRIVER,
    localStorageRoot: env.LOCAL_STORAGE_ROOT,
  };
});
