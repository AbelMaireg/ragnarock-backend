import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { ProjectApiKeysController } from "./project-api-keys.controller";
import { ProjectApiKeysService } from "./project-api-keys.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule],
  controllers: [ProjectApiKeysController],
  providers: [ProjectApiKeysService],
  exports: [ProjectApiKeysService],
})
export class ProjectApiKeysModule {}
