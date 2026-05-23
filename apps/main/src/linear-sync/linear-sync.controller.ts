import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { Auth } from "@app/auth";
import { ProjectMemberRole } from "@prisma/client";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ProjectRole } from "../project-auth/project-role.decorator";
import { ProjectRoleGuard } from "../project-auth/project-role.guard";
import { LinkLinearProjectDto } from "./dto/link-linear-project.dto";
import { UpdateLinearSettingsDto } from "./dto/linear-settings.dto";
import { ListSyncRunsQueryDto } from "./dto/list-sync-runs.dto";
import { LinearMappingService } from "./services/linear-mapping.service";
import { LinearSyncService } from "./services/linear-sync.service";
import { LinearApiExceptionFilter } from "./filters/linear-api.exception-filter";

@Auth()
@UseFilters(LinearApiExceptionFilter)
@Controller("projects")
export class LinearSyncController {
  constructor(
    private readonly mappingService: LinearMappingService,
    private readonly syncService: LinearSyncService,
  ) {}

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/linear")
  getStatus(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.mappingService.getStatus(organizationId, projectId);
  }

  @UseGuards(ProjectMemberGuard, ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Put(":projectId/linear/link")
  link(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Body() dto: LinkLinearProjectDto,
  ) {
    return this.mappingService.linkProject(organizationId, projectId, dto);
  }

  @UseGuards(ProjectMemberGuard, ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Delete(":projectId/linear/link")
  unlink(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.mappingService.unlinkProject(organizationId, projectId);
  }

  @UseGuards(ProjectMemberGuard, ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Patch(":projectId/linear/settings")
  updateSettings(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Body() dto: UpdateLinearSettingsDto,
  ) {
    return this.mappingService.updateSettings(organizationId, projectId, dto);
  }

  @UseGuards(ProjectMemberGuard)
  @Post(":projectId/linear/import")
  import(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.syncService.import(organizationId, projectId);
  }

  @UseGuards(ProjectMemberGuard)
  @Post(":projectId/linear/export")
  export(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.syncService.export(organizationId, projectId);
  }

  @UseGuards(ProjectMemberGuard)
  @Post(":projectId/linear/sync")
  sync(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.syncService.sync(organizationId, projectId);
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/linear/sync-runs")
  listSyncRuns(@Param("projectId") projectId: string, @Query() query: ListSyncRunsQueryDto) {
    return this.syncService.listSyncRuns(projectId, query.page, query.limit);
  }
}
