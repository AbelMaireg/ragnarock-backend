import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Auth } from "@app/auth";
import { CurrentUser } from "@app/auth/decorators/current-user.decorator";
import { ProjectMemberRole } from "@prisma/client";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ProjectRole } from "../project-auth/project-role.decorator";
import { ProjectRoleGuard } from "../project-auth/project-role.guard";
import {
  CreateProjectDocumentationDto,
  ListProjectDocumentationsQueryDto,
  UpdateProjectDocumentationDto,
} from "./dto/project-documentation.dto";
import { ProjectDocumentationsService } from "./project-documentations.service";

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/documentations")
export class ProjectDocumentationsController {
  constructor(private readonly projectDocumentationsService: ProjectDocumentationsService) {}

  @Get()
  list(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Query() query: ListProjectDocumentationsQueryDto,
  ) {
    return this.projectDocumentationsService.list(projectId, query);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post()
  create(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProjectDocumentationDto,
  ) {
    return this.projectDocumentationsService.create(projectId, userId, dto);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Patch(":documentationId")
  update(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Param("documentationId") documentationId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProjectDocumentationDto,
  ) {
    return this.projectDocumentationsService.update(projectId, documentationId, dto, userId);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Delete(":documentationId")
  remove(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Param("documentationId") documentationId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.projectDocumentationsService.remove(projectId, documentationId, userId);
  }
}
