import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
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
  CreateProjectSkillDto,
  ExportSkillQueryDto,
  UpdateProjectSkillDto,
} from "./dto/project-skill.dto";
import { ProjectSkillsService } from "./project-skills.service";

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/skills")
export class ProjectSkillsController {
  constructor(private readonly projectSkillsService: ProjectSkillsService) {}

  @Get()
  list(@CurrentOrganization() organizationId: string, @Param("projectId") projectId: string) {
    return this.projectSkillsService.list(projectId, organizationId);
  }

  @Get(":skillId/export")
  @Header("Cache-Control", "no-store")
  async export(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("skillId") skillId: string,
    @Query() query: ExportSkillQueryDto,
  ): Promise<StreamableFile> {
    const skill = await this.projectSkillsService.getById(projectId, organizationId, skillId);
    const safeSlug = skill.slug.replace(/[^a-z0-9-_]/gi, "-");
    if (query.format === "md") {
      const content = this.projectSkillsService.buildExportMarkdown(skill, projectId);
      return new StreamableFile(Buffer.from(content, "utf-8"), {
        type: "text/markdown; charset=utf-8",
        disposition: `attachment; filename="${safeSlug}.md"`,
      });
    }
    const content = this.projectSkillsService.buildExportTxt(skill);
    return new StreamableFile(Buffer.from(content, "utf-8"), {
      type: "text/plain; charset=utf-8",
      disposition: `attachment; filename="${safeSlug}.txt"`,
    });
  }

  @Get(":skillId")
  getOne(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("skillId") skillId: string,
  ) {
    return this.projectSkillsService.getById(projectId, organizationId, skillId);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post()
  create(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProjectSkillDto,
  ) {
    return this.projectSkillsService.create(projectId, organizationId, userId, dto);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Patch(":skillId")
  update(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("skillId") skillId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProjectSkillDto,
  ) {
    return this.projectSkillsService.update(projectId, organizationId, skillId, userId, dto);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin)
  @Delete(":skillId")
  remove(
    @CurrentOrganization() organizationId: string,
    @Param("projectId") projectId: string,
    @Param("skillId") skillId: string,
    @CurrentUser("id") _userId: string,
  ) {
    return this.projectSkillsService.remove(projectId, organizationId, skillId);
  }
}
