import { Module } from "@nestjs/common";
import { AppConfigModule } from "@app/config";
import { LoggerModule } from "@app/logger";
import { PrismaModule } from "@app/prisma";
import { UploaderModule } from "@app/uploader";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [AppConfigModule, LoggerModule, PrismaModule, UploaderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
