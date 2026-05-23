import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import type { ProjectScopedRequest } from "../project-auth/project-auth.types";

const ORG_ADMIN_ROLES = new Set(["owner", "admin"]);

@Injectable()
export class OrganizationAdminGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ProjectScopedRequest>();
    const userId = request.user?.id;
    const organizationId =
      request.activeOrganizationId ??
      (typeof request.session?.activeOrganizationId === "string"
        ? request.session.activeOrganizationId
        : undefined);

    if (typeof userId !== "string" || !organizationId) {
      throw new ForbiddenException("Active organization and user are required");
    }

    const member = await this.prismaService.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { role: true },
    });

    if (!member || !ORG_ADMIN_ROLES.has(member.role)) {
      throw new ForbiddenException("Organization owner or admin role is required");
    }

    return true;
  }
}
