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
import { CurrentUser } from "@app/auth/decorators/current-user.decorator";
import { Auth } from "@app/auth";
import { ProjectMemberRole } from "@prisma/client";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ProjectRole } from "../project-auth/project-role.decorator";
import { ProjectRoleGuard } from "../project-auth/project-role.guard";
import { CreateProjectDto, ListProjectsQueryDto, UpdateProjectDto } from "./dto/project.dto";
import { ProjectsService } from "./projects.service";

@Auth()
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
    @Query() query: ListProjectsQueryDto,
  ) {
    return this.projectsService.list(organizationId, userId, query);
  }

  @Post()
  create(
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(organizationId, userId, dto);
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId")
  findOne(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.projectsService.findOne(organizationId, projectId);
  }

  @UseGuards(ProjectMemberGuard, ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Patch(":projectId")
  update(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(organizationId, projectId, dto, userId);
  }

  @UseGuards(ProjectMemberGuard, ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner)
  @Delete(":projectId")
  remove(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.projectsService.remove(organizationId, projectId, userId);
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/my-role")
  getMyRole(@Param("projectId") projectId: string, @CurrentUser("id") userId: string) {
    return this.projectsService.getMyRole(projectId, userId);
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/overview")
  getOverview(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.projectsService.overview(organizationId, projectId);
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/features")
  getFeatures(@Param("projectId") projectId: string) {
    return this.projectsService.getFeatures(projectId);
  }
}
