import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "@app/prisma";
import { IntegrationsModule } from "../integrations/integrations.module";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { LinearSyncController } from "./linear-sync.controller";
import { LinearWebhookController } from "./linear-webhook.controller";
import { LinearOrgController } from "./linear-org.controller";
import { LinearGraphqlService } from "./services/linear-graphql.service";
import { LinearCredentialsResolver } from "./services/linear-credentials.resolver";
import { LinearMappingService } from "./services/linear-mapping.service";
import { LinearImportService } from "./services/linear-import.service";
import { LinearExportService } from "./services/linear-export.service";
import { LinearSyncService } from "./services/linear-sync.service";
import { LinearSyncSchedulerService } from "./services/linear-sync-scheduler.service";
import { LinearWebhookService } from "./services/linear-webhook.service";
import { LinearApiExceptionFilter } from "./filters/linear-api.exception-filter";

@Module({
  imports: [PrismaModule, ProjectAuthModule, IntegrationsModule, ScheduleModule.forRoot()],
  controllers: [LinearSyncController, LinearWebhookController, LinearOrgController],
  providers: [
    LinearGraphqlService,
    LinearCredentialsResolver,
    LinearMappingService,
    LinearImportService,
    LinearExportService,
    LinearSyncService,
    LinearSyncSchedulerService,
    LinearWebhookService,
    LinearApiExceptionFilter,
  ],
  exports: [LinearGraphqlService, LinearCredentialsResolver, LinearExportService, LinearMappingService],
})
export class LinearSyncModule {}
