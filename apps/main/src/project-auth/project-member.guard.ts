import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ProjectScopedRequest } from "./project-auth.types";
import { ProjectAccessService } from "./project-access.service";

@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(private readonly projectAccessService: ProjectAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ProjectScopedRequest>();
    const projectId = request.params?.projectId;
    if (!projectId) {
      return true;
    }

    const organizationId = this.projectAccessService.getActiveOrganizationId(request.session);
    const userId = this.projectAccessService.getUserId(request.user);
    const role = await this.projectAccessService.validateProjectMembership({
      projectId,
      userId,
      organizationId,
    });

    request.projectMemberRole = role;
    request.activeOrganizationId = organizationId;
    return true;
  }
}
