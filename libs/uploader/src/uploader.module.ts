import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { UploaderService } from "./uploader.service";
import { FILE_STORAGE_STRATEGY } from "./uploader.tokens";
import { FileStorageStrategy } from "./strategies/file-storage.strategy";
import { LocalStorageStrategy } from "./strategies/local-storage.strategy";
import { S3StorageStrategy } from "./strategies/s3-storage.strategy";

@Global()
@Module({
  providers: [
    {
      provide: FILE_STORAGE_STRATEGY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): FileStorageStrategy => {
        const driver = configService.get<"local" | "s3">("filesystem.driver", "local");

        if (driver === "local") {
          const rootDir = configService.get<string>("filesystem.localStorageRoot", "uploads");
          return new LocalStorageStrategy(rootDir);
        }

        if (driver === "s3") {
          const region = configService.getOrThrow<string>("s3.region");
          const bucket = configService.getOrThrow<string>("s3.bucket");
          const accessKeyId = configService.getOrThrow<string>("s3.accessKeyId");
          const secretAccessKey = configService.getOrThrow<string>("s3.secretAccessKey");
          const endpoint = configService.get<string>("s3.endpoint");
          const forcePathStyle = configService.get<boolean>("s3.forcePathStyle", false);

          const client = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
            endpoint,
            forcePathStyle,
          });

          return new S3StorageStrategy(client, bucket);
        }

        throw new Error(`Unsupported filesystem driver: ${driver}`);
      },
    },
    UploaderService,
  ],
  exports: [UploaderService],
})
export class UploaderModule {}
