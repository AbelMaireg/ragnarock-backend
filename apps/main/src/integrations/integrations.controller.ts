import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Auth } from "@app/auth";
import { CurrentUser } from "@app/auth/decorators/current-user.decorator";
import { IntegrationProviderKey } from "@prisma/client";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ConnectLinearDto } from "./dto/connect-linear.dto";
import { IntegrationsService } from "./integrations.service";
import { OrganizationAdminGuard } from "./organization-admin.guard";

@Auth()
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  list(@CurrentOrganization() organizationId: string) {
    return this.integrationsService.list(organizationId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post("linear")
  connectLinear(
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: ConnectLinearDto,
  ) {
    return this.integrationsService.connectLinear(organizationId, userId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Delete(":provider")
  disconnect(
    @CurrentOrganization() organizationId: string,
    @Param("provider", new ParseEnumPipe(IntegrationProviderKey)) provider: IntegrationProviderKey,
  ) {
    return this.integrationsService.disconnect(organizationId, provider);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post(":provider/verify")
  verify(
    @CurrentOrganization() organizationId: string,
    @Param("provider", new ParseEnumPipe(IntegrationProviderKey)) provider: IntegrationProviderKey,
  ) {
    return this.integrationsService.verify(organizationId, provider);
  }
}
