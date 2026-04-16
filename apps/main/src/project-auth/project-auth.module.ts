import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAccessService } from "./project-access.service";
import { ProjectMemberGuard } from "./project-member.guard";
import { ProjectRoleGuard } from "./project-role.guard";

@Module({
  imports: [PrismaModule],
  providers: [ProjectAccessService, ProjectMemberGuard, ProjectRoleGuard],
  exports: [ProjectAccessService, ProjectMemberGuard, ProjectRoleGuard],
})
export class ProjectAuthModule {}
