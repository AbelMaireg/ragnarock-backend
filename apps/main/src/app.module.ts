import { Module } from "@nestjs/common";
import { AppConfigModule } from "@app/config";
import { LoggerModule } from "@app/logger";
import { UploaderModule } from "@app/uploader";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [AppConfigModule, LoggerModule, UploaderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
