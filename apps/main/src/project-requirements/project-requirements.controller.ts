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
  CreateProjectRequirementDto,
  ListProjectRequirementsQueryDto,
  UpdateProjectRequirementDto,
} from "./dto/project-requirement.dto";
import { ProjectRequirementsService } from "./project-requirements.service";

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/requirements")
export class ProjectRequirementsController {
  constructor(private readonly projectRequirementsService: ProjectRequirementsService) {}

  @Get()
  list(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Query() query: ListProjectRequirementsQueryDto,
  ) {
    return this.projectRequirementsService.list(projectId, query);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post()
  create(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProjectRequirementDto,
  ) {
    return this.projectRequirementsService.create(projectId, userId, dto);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Patch(":requirementId")
  update(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProjectRequirementDto,
  ) {
    return this.projectRequirementsService.update(projectId, requirementId, dto, userId);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Delete(":requirementId")
  remove(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.projectRequirementsService.remove(projectId, requirementId, userId);
  }
}
