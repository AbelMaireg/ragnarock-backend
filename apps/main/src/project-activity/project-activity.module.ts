import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { ProjectActivityController } from "./project-activity.controller";
import { ProjectActivityService } from "./project-activity.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule],
  controllers: [ProjectActivityController],
  providers: [ProjectActivityService],
})
export class ProjectActivityModule {}
