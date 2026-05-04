import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import appConfig from "./app.config";
import authConfig from "./auth.config";
import brevoConfig from "./brevo.config";
import cacheConfig from "./cache.config";
import databaseConfig from "./database.config";
import filesystemConfig from "./filesystem.config";
import mailConfig from "./mail.config";
import nodemailerConfig from "./nodemailer.config";
import redisEmailQueueConfig from "./redis-email-queue.config";
import s3Config from "./s3.config";
import typesenseConfig from "./typesense.config";
import integrationsConfig from "./integrations.config";
import aiAgentConfig from "./ai-agent.config";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        cacheConfig,
        s3Config,
        filesystemConfig,
        mailConfig,
        nodemailerConfig,
        brevoConfig,
        redisEmailQueueConfig,
        typesenseConfig,
        integrationsConfig,
        aiAgentConfig,
      ],
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
