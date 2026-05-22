import { Controller, Get, Query, Req } from "@nestjs/common";
import { Auth, CurrentUser } from "@app/auth";
import type { Request } from "express";
import { ListMyGithubReposQueryDto } from "./dto/repositories.dto";
import { RepositoriesService } from "./repositories.service";

@Auth()
@Controller("repositories")
export class GithubRepoSearchController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get("search")
  search(
    @CurrentUser("id") userId: string,
    @Req() req: Request,
    @Query() query: ListMyGithubReposQueryDto,
  ) {
    return this.repositoriesService.listMyGithubRepos(userId, req, query);
  }
}
