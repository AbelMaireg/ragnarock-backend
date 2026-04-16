import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Auth } from "@app/auth";
import { ProjectMemberRole } from "@prisma/client";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ProjectRole } from "../project-auth/project-role.decorator";
import { ProjectRoleGuard } from "../project-auth/project-role.guard";
import { AddProjectMemberDto, UpdateProjectMemberRoleDto } from "./dto/project-member.dto";
import { ProjectMembersService } from "./project-members.service";

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/members")
export class ProjectMembersController {
  constructor(private readonly projectMembersService: ProjectMembersService) {}

  @Get()
  list(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.projectMembersService.list(organizationId, projectId);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Post()
  add(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectMembersService.add(organizationId, projectId, dto);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Patch(":userId")
  updateRole(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateProjectMemberRoleDto,
  ) {
    return this.projectMembersService.updateRole(organizationId, projectId, userId, dto);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Delete(":userId")
  remove(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("userId") userId: string,
  ) {
    return this.projectMembersService.remove(organizationId, projectId, userId);
  }
}
