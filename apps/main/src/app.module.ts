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
import { ProjectActivityModule } from "./project-activity/project-activity.module";
import { ProjectDocumentationsModule } from "./project-documentations/project-documentations.module";
import { ProjectMembersModule } from "./project-members/project-members.module";
import { ProjectRequirementsModule } from "./project-requirements/project-requirements.module";
import { ProjectTasksModule } from "./project-tasks/project-tasks.module";
import { ProjectsModule } from "./projects/projects.module";
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
    ProjectsModule,
    ProjectMembersModule,
    ProjectTasksModule,
    ProjectDocumentationsModule,
    ProjectRequirementsModule,
    ProjectActivityModule,
  ],
  controllers: [AppController, UsersController],
  providers: [AppService, UsersService],
})
export class AppModule {}
