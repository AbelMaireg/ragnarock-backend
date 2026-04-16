import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectMemberRole } from "@prisma/client";
import { PROJECT_ROLE_KEY, ProjectScopedRequest } from "./project-auth.types";

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ProjectMemberRole[]>(
      PROJECT_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ProjectScopedRequest>();
    const role = request.projectMemberRole;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException("Insufficient project role permissions");
    }

    return true;
  }
}
