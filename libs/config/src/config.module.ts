import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import appConfig from "./app.config";
import cacheConfig from "./cache.config";
import databaseConfig from "./database.config";
import filesystemConfig from "./filesystem.config";
import s3Config from "./s3.config";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [appConfig, databaseConfig, cacheConfig, s3Config, filesystemConfig],
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? "development"}.local`,
        `.env.${process.env.NODE_ENV ?? "development"}`,
        ".env.local",
        ".env",
      ],
    }),
  ],
})
export class AppConfigModule {}
