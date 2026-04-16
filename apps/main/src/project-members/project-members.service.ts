import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ProjectMemberRole } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { AddProjectMemberDto, UpdateProjectMemberRoleDto } from "./dto/project-member.dto";

@Injectable()
export class ProjectMembersService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(organizationId: string, projectId: string) {
    await this.ensureProject(organizationId, projectId);
    return this.prismaService.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async add(organizationId: string, projectId: string, dto: AddProjectMemberDto) {
    await this.ensureProject(organizationId, projectId);
    const orgMembership = await this.prismaService.member.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: dto.userId },
      },
      select: { id: true },
    });
    if (!orgMembership) {
      throw new ForbiddenException("User must belong to the organization");
    }
    return this.prismaService.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: dto.userId } },
      create: {
        projectId,
        userId: dto.userId,
        role: dto.role,
      },
      update: { role: dto.role },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
  }

  async updateRole(
    organizationId: string,
    projectId: string,
    userId: string,
    dto: UpdateProjectMemberRoleDto,
  ) {
    await this.ensureProject(organizationId, projectId);
    return this.prismaService.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role: dto.role },
    });
  }

  async remove(organizationId: string, projectId: string, userId: string) {
    await this.ensureProject(organizationId, projectId);

    const ownerCount = await this.prismaService.projectMember.count({
      where: { projectId, role: ProjectMemberRole.owner },
    });
    const member = await this.prismaService.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

    if (!member) {
      throw new NotFoundException("Project member not found");
    }
    if (member.role === ProjectMemberRole.owner && ownerCount <= 1) {
      throw new ForbiddenException("At least one owner must remain on the project");
    }

    await this.prismaService.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    return { success: true };
  }

  private async ensureProject(organizationId: string, projectId: string) {
    const project = await this.prismaService.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }
}
