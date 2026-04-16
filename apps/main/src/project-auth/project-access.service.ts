import { ForbiddenException, Injectable } from "@nestjs/common";
import { ProjectMemberRole } from "@prisma/client";
import { PrismaService } from "@app/prisma";

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prismaService: PrismaService) {}

  getActiveOrganizationId(session?: Record<string, unknown>): string {
    const activeOrganizationId = session?.activeOrganizationId;
    if (typeof activeOrganizationId !== "string" || !activeOrganizationId) {
      throw new ForbiddenException("Active organization is required");
    }
    return activeOrganizationId;
  }

  getUserId(user?: Record<string, unknown>): string {
    const userId = user?.id;
    if (typeof userId !== "string" || !userId) {
      throw new ForbiddenException("Authenticated user is required");
    }
    return userId;
  }

  async validateProjectMembership(params: {
    projectId: string;
    userId: string;
    organizationId: string;
  }): Promise<ProjectMemberRole> {
    const member = await this.prismaService.projectMember.findFirst({
      where: {
        projectId: params.projectId,
        userId: params.userId,
        project: { organizationId: params.organizationId },
      },
      select: { role: true },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this project");
    }

    return member.role;
  }
}
