import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Auth, CurrentUser } from "@app/auth";
import { ProjectMemberRole } from "@prisma/client";
import type { Request } from "express";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ProjectRole } from "../project-auth/project-role.decorator";
import { ProjectRoleGuard } from "../project-auth/project-role.guard";
import {
  LinkProjectRepositoryDto,
  BrowseRepositoryQueryDto,
  ListIssuesQueryDto,
  ListPullsQueryDto,
  ListRepositoryCommitsQueryDto,
} from "./dto/repositories.dto";
import { RepositoriesService } from "./repositories.service";

/**
 * Routes live under the same `@Controller('projects')` prefix as {@link ProjectsController}
 * so Nest/Express registers `/projects/:projectId/repositories` reliably (same router scope).
 */
@Auth()
@Controller("projects")
export class ProjectRepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/repositories/:repositoryId/browse")
  browse(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
    @Query() query: BrowseRepositoryQueryDto,
  ) {
    return this.repositoriesService.browseRepository(
      organizationId,
      projectId,
      repositoryId,
      userId,
      req,
      query,
    );
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/repositories/:repositoryId/file")
  file(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
    @Query() query: BrowseRepositoryQueryDto,
  ) {
    return this.repositoriesService.getRepositoryFile(
      organizationId,
      projectId,
      repositoryId,
      userId,
      req,
      query,
    );
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/repositories/:repositoryId/commits")
  listCommits(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
    @Query() query: ListRepositoryCommitsQueryDto,
  ) {
    return this.repositoriesService.listCommits(
      organizationId,
      projectId,
      repositoryId,
      userId,
      req,
      query,
    );
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/repositories/:repositoryId/contributors")
  listContributors(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
  ) {
    return this.repositoriesService.listContributors(
      organizationId,
      projectId,
      repositoryId,
      userId,
      req,
    );
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/repositories/:repositoryId/pulls")
  listPulls(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
    @Query() query: ListPullsQueryDto,
  ) {
    return this.repositoriesService.listPulls(
      organizationId,
      projectId,
      repositoryId,
      userId,
      req,
      query,
    );
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/repositories/:repositoryId/issues")
  listIssues(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
    @Query() query: ListIssuesQueryDto,
  ) {
    return this.repositoriesService.listIssues(
      organizationId,
      projectId,
      repositoryId,
      userId,
      req,
      query,
    );
  }

  @UseGuards(ProjectMemberGuard, ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Post(":projectId/repositories/:repositoryId/refresh")
  refresh(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
  ) {
    return this.repositoriesService.refreshRepository(
      organizationId,
      projectId,
      repositoryId,
      userId,
      req,
    );
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/repositories/:repositoryId")
  getOne(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
  ) {
    return this.repositoriesService.getLinkedDetail(
      organizationId,
      projectId,
      repositoryId,
      userId,
      req,
    );
  }

  @UseGuards(ProjectMemberGuard, ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Delete(":projectId/repositories/:repositoryId")
  unlink(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("repositoryId") repositoryId: string,
  ) {
    return this.repositoriesService.unlinkRepository(organizationId, projectId, repositoryId);
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":projectId/repositories")
  list(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.repositoriesService.listLinked(organizationId, projectId);
  }

  @UseGuards(ProjectMemberGuard, ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Post(":projectId/repositories")
  link(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Req() req: Request,
    @Body() dto: LinkProjectRepositoryDto,
  ) {
    return this.repositoriesService.linkRepository(organizationId, projectId, userId, req, dto);
  }
}
