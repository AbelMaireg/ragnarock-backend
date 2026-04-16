import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ProjectMemberRole } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import {
  CreateProjectDto,
  ListProjectsQueryDto,
  PaginatedData,
  ProjectListItem,
  ProjectRoleSummary,
  UpdateProjectDto,
} from "./dto/project.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(organizationId: string, query: ListProjectsQueryDto): Promise<PaginatedData<ProjectListItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { description: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        include: {
          members: { select: { userId: true, role: true }, orderBy: { createdAt: "asc" } },
          _count: { select: { requirements: true } },
        },
      }),
      this.prismaService.project.count({ where }),
    ]);

    const mappedItems: ProjectListItem[] = items.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ownerId:
        project.members.find((member) => member.role === ProjectMemberRole.owner)?.userId ??
        project.members[0]?.userId ??
        "",
      memberCount: project.members.length,
      requirementCount: project._count.requirements,
    }));

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
    return {
      data: mappedItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async create(organizationId: string, userId: string, dto: CreateProjectDto) {
    const orgMember = await this.prismaService.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true },
    });
    if (!orgMember) {
      throw new ForbiddenException("User is not a member of the active organization");
    }

    const project = await this.prismaService.project.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        members: {
          create: { userId, role: ProjectMemberRole.owner },
        },
      },
      include: {
        members: true,
        _count: { select: { requirements: true } },
      },
    });
    await this.prismaService.projectActivity.create({
      data: {
        projectId: project.id,
        actorId: userId,
        action: "project.created",
        entityType: "project",
        entityId: project.id,
        metadata: { name: project.name },
      },
    });
    return project;
  }

  async findOne(organizationId: string, projectId: string) {
    const project = await this.prismaService.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        members: true,
        _count: { select: { requirements: true, tasks: true, documentations: true } },
      },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  async update(organizationId: string, projectId: string, dto: UpdateProjectDto, userId: string) {
    await this.ensureExists(organizationId, projectId);
    const project = await this.prismaService.project.update({
      where: { id: projectId },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        status: dto.status,
      },
    });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "project.updated",
        entityType: "project",
        entityId: projectId,
      },
    });
    return project;
  }

  async remove(organizationId: string, projectId: string, userId: string) {
    await this.ensureExists(organizationId, projectId);
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "project.deleted",
        entityType: "project",
        entityId: projectId,
      },
    });
    await this.prismaService.project.delete({ where: { id: projectId } });
    return { success: true };
  }

  async getMyRole(projectId: string, userId: string): Promise<ProjectRoleSummary> {
    const projectMember = await this.prismaService.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (!projectMember) {
      throw new ForbiddenException("Project membership required");
    }
    return { role: projectMember.role };
  }

  async overview(organizationId: string, projectId: string) {
    const project = await this.findOne(organizationId, projectId);
    const [recentTasks, recentRequirements, recentDocs] = await this.prismaService.$transaction([
      this.prismaService.projectTask.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      this.prismaService.projectRequirement.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      this.prismaService.projectDocumentation.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      project,
      recentTasks,
      recentRequirements,
      recentDocs,
    };
  }

  private async ensureExists(organizationId: string, projectId: string) {
    const project = await this.prismaService.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }
}
