import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsDateString, IsOptional, IsString, MinLength, MaxLength } from "class-validator";
import { Auth } from "@app/auth";
import { CurrentUser } from "@app/auth/decorators/current-user.decorator";
import { ProjectMemberRole } from "@prisma/client";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ProjectRole } from "../project-auth/project-role.decorator";
import { ProjectRoleGuard } from "../project-auth/project-role.guard";
import { ProjectApiKeysService } from "./project-api-keys.service";

class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/api-keys")
export class ProjectApiKeysController {
  constructor(private readonly service: ProjectApiKeysService) {}

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Post()
  create(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.service.create({
      projectId,
      organizationId,
      userId,
      name: dto.name,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Get()
  list(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.service.list(projectId, organizationId);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Delete(":keyId")
  revoke(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("keyId") keyId: string,
  ) {
    return this.service.revoke({ projectId, organizationId, keyId });
  }
}
