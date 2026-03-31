import { Module } from "@nestjs/common";
import { AppConfigModule } from "@app/config";
import { LoggerModule } from "@app/logger";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AppConfigModule, LoggerModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
