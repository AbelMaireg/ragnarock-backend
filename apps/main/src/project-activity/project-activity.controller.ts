import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { Auth } from "@app/auth";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ListProjectActivityQueryDto } from "./dto/project-activity.dto";
import { ProjectActivityService } from "./project-activity.service";

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/activity")
export class ProjectActivityController {
  constructor(private readonly projectActivityService: ProjectActivityService) {}

  @Get()
  list(
    @CurrentOrganization() _organizationId: string,
    @Param("projectId") projectId: string,
    @Query() query: ListProjectActivityQueryDto,
  ) {
    return this.projectActivityService.list(projectId, query);
  }
}
