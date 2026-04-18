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
  CreateProjectTaskDto,
  ListProjectTasksQueryDto,
  ReorderProjectTasksDto,
  UpdateProjectTaskDto,
} from "./dto/project-task.dto";
import { ProjectTasksService } from "./project-tasks.service";

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/tasks")
export class ProjectTasksController {
  constructor(private readonly projectTasksService: ProjectTasksService) {}

  @Get()
  list(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Query() query: ListProjectTasksQueryDto,
  ) {
    return this.projectTasksService.list(projectId, query);
  }

  @Get(":taskId")
  getOne(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
  ) {
    return this.projectTasksService.getById(projectId, taskId);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Patch("reorder")
  reorder(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: ReorderProjectTasksDto,
  ) {
    return this.projectTasksService.reorder(projectId, dto, userId);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post()
  create(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProjectTaskDto,
  ) {
    return this.projectTasksService.create(projectId, userId, dto);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Patch(":taskId")
  update(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.projectTasksService.update(projectId, taskId, dto, userId);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Delete(":taskId")
  remove(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.projectTasksService.remove(projectId, taskId, userId);
  }
}
