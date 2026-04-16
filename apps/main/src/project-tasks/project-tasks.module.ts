import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { ProjectTasksController } from "./project-tasks.controller";
import { ProjectTasksService } from "./project-tasks.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule],
  controllers: [ProjectTasksController],
  providers: [ProjectTasksService],
})
export class ProjectTasksModule {}
