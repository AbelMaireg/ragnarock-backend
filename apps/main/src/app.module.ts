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
import { AiRequirementsModule } from "./ai-requirements/ai-requirements.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { LinearSyncModule } from "./linear-sync/linear-sync.module";
import { ProjectActivityModule } from "./project-activity/project-activity.module";
import { ProjectSkillsModule } from "./project-skills/project-skills.module";
import { ProjectDocumentationsModule } from "./project-documentations/project-documentations.module";
import { ProjectMembersModule } from "./project-members/project-members.module";
import { ProjectRequirementsModule } from "./project-requirements/project-requirements.module";
import { ProjectTasksModule } from "./project-tasks/project-tasks.module";
import { ProjectApiKeysModule } from "./project-api-keys/project-api-keys.module";
import { ProjectsModule } from "./projects/projects.module";
import { RepositoriesModule } from "./repositories/repositories.module";
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
    RepositoriesModule,
    ProjectsModule,
    ProjectApiKeysModule,
    ProjectMembersModule,
    ProjectTasksModule,
    ProjectDocumentationsModule,
    ProjectRequirementsModule,
    ProjectActivityModule,
    ProjectSkillsModule,
    IntegrationsModule,
    LinearSyncModule,
    AiRequirementsModule,
  ],
  controllers: [AppController, UsersController],
  providers: [AppService, UsersService],
})
export class AppModule {}
