import { Module } from "@nestjs/common";
import { AuthModule } from "@app/auth";
import { AppConfigModule } from "@app/config";
import { LoggerModule } from "@app/logger";
import { MailerModule } from "@app/mailer";
import { PrismaModule } from "@app/prisma";
import { TypesenseModule } from "@app/typesense";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AppConfigModule, LoggerModule, PrismaModule, MailerModule, TypesenseModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
