import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { ProjectDocumentationsController } from "./project-documentations.controller";
import { ProjectDocumentationsService } from "./project-documentations.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule],
  controllers: [ProjectDocumentationsController],
  providers: [ProjectDocumentationsService],
})
export class ProjectDocumentationsModule {}
