import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { ProjectMembersController } from "./project-members.controller";
import { ProjectMembersService } from "./project-members.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule],
  controllers: [ProjectMembersController],
  providers: [ProjectMembersService],
})
export class ProjectMembersModule {}
