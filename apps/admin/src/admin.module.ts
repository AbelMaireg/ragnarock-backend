import { Module } from "@nestjs/common";
import { AppConfigModule } from "@app/config";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AppConfigModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
