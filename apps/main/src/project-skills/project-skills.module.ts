import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { ProjectSkillsController } from "./project-skills.controller";
import { ProjectSkillsService } from "./project-skills.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule],
  controllers: [ProjectSkillsController],
  providers: [ProjectSkillsService],
})
export class ProjectSkillsModule {}
