import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { ProjectRequirementsController } from "./project-requirements.controller";
import { ProjectRequirementsService } from "./project-requirements.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule],
  controllers: [ProjectRequirementsController],
  providers: [ProjectRequirementsService],
})
export class ProjectRequirementsModule {}
