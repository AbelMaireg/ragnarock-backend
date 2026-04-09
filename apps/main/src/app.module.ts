import { Module } from "@nestjs/common";
import { AuthModule } from "@app/auth";
import { AppConfigModule } from "@app/config";
import { LoggerModule } from "@app/logger";
import { MailerModule } from "@app/mailer";
import { PrismaModule } from "@app/prisma";
import { TypesenseModule } from "@app/typesense";
import { UploaderModule } from "@app/uploader";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersController } from "./users/users.controller";
import { UsersService } from "./users/users.service";

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    PrismaModule,
    UploaderModule,
    MailerModule,
    TypesenseModule,
    AuthModule,
  ],
  controllers: [AppController, UsersController],
  providers: [AppService, UsersService],
})
export class AppModule {}
