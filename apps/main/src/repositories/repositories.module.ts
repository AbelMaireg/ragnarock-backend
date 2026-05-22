import { Module } from "@nestjs/common";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { GithubRepoSearchController } from "./github-repo-search.controller";
import { ProjectRepositoriesController } from "./project-repositories.controller";
import { RepositoriesService } from "./repositories.service";

@Module({
  imports: [ProjectAuthModule],
  controllers: [ProjectRepositoriesController, GithubRepoSearchController],
  providers: [RepositoriesService],
})
export class RepositoriesModule {}
