import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { Auth } from "@app/auth";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ListProjectSpecificationsQueryDto } from "./dto/ai-chat.dto";
import { ProjectSpecificationsService } from "./project-specifications.service";

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/specifications")
export class ProjectSpecificationsController {
  constructor(private readonly projectSpecificationsService: ProjectSpecificationsService) {}

  @Get()
  list(
    @Param("projectId") projectId: string,
    @Query() query: ListProjectSpecificationsQueryDto,
  ) {
    return this.projectSpecificationsService.list(projectId, query);
  }

  @Get(":specificationId")
  findOne(
    @Param("projectId") projectId: string,
    @Param("specificationId") specificationId: string,
  ) {
    return this.projectSpecificationsService.findOne(projectId, specificationId);
  }
}
