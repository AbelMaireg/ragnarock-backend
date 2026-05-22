import { Controller, Get, Query } from "@nestjs/common";
import { Auth } from "@app/auth";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { LinearGraphqlService } from "./services/linear-graphql.service";
import { LinearCredentialsResolver } from "./services/linear-credentials.resolver";
import { LinearProjectsQueryDto } from "./dto/linear-projects-query.dto";

@Auth()
@Controller("integrations/linear")
export class LinearOrgController {
  constructor(
    private readonly graphql: LinearGraphqlService,
    private readonly credentials: LinearCredentialsResolver,
  ) {}

  @Get("teams")
  async listTeams(@CurrentOrganization() organizationId: string) {
    const pat = await this.credentials.resolvePat(organizationId);
    const teams = await this.graphql.listTeams(pat);
    return { teams };
  }

  @Get("projects")
  async listProjects(
    @CurrentOrganization() organizationId: string,
    @Query() query: LinearProjectsQueryDto,
  ) {
    const pat = await this.credentials.resolvePat(organizationId);
    const projects = await this.graphql.listProjects(pat, query.teamId);
    return { projects };
  }
}
