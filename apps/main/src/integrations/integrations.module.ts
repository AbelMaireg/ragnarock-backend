import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsCredentialsService } from "./integrations-credentials.service";
import { IntegrationsService } from "./integrations.service";
import { OrganizationAdminGuard } from "./organization-admin.guard";

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationsCredentialsService, OrganizationAdminGuard],
  exports: [IntegrationsCredentialsService],
})
export class IntegrationsModule {}
