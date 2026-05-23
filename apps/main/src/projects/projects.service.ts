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

function groupByCountAll(row: { _count: unknown }): number {
  const raw = row._count;
  if (
    raw &&
    typeof raw === "object" &&
    "_all" in raw &&
    typeof (raw as { _all: unknown })._all === "number"
  ) {
    return (raw as { _all: number })._all;
  }
  return 0;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(
    organizationId: string,
    userId: string,
    query: ListProjectsQueryDto,
  ): Promise<PaginatedData<ProjectListItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      members: { some: { userId } },
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      taskGroups,
      requirementGroups,
      team,
      recentTasks,
      recentRequirements,
      recentDocs,
      activityGroups,
      lastDocUpdate,
      lastActivity,
      organization,
    ] = await this.prismaService.$transaction([
      this.prismaService.projectTask.groupBy({
        by: ["status"],
        where: { projectId },
        _count: { _all: true },
        orderBy: { status: "asc" },
      }),
      this.prismaService.projectRequirement.groupBy({
        by: ["status"],
        where: { projectId },
        _count: { _all: true },
        orderBy: { status: "asc" },
      }),
      this.prismaService.projectMember.findMany({
        where: { projectId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prismaService.projectTask.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      this.prismaService.projectRequirement.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      this.prismaService.projectDocumentation.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      this.prismaService.projectActivity.groupBy({
        by: ["entityType"],
        where: { projectId, createdAt: { gte: sevenDaysAgo } },
        _count: { _all: true },
        orderBy: { entityType: "asc" },
      }),
      this.prismaService.projectDocumentation.aggregate({
        where: { projectId },
        _max: { updatedAt: true },
      }),
      this.prismaService.projectActivity.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prismaService.organization.findUnique({
        where: { id: project.organizationId },
        select: { name: true, slug: true },
      }),
    ]);

    const tasksByStatus: Record<string, number> = {};
    let totalTasks = 0;
    for (const row of taskGroups) {
      const c = groupByCountAll(row);
      totalTasks += c;
      tasksByStatus[row.status] = c;
    }

    const requirementsByStatus: Record<string, number> = {};
    let totalRequirements = 0;
    for (const row of requirementGroups) {
      const c = groupByCountAll(row);
      totalRequirements += c;
      requirementsByStatus[row.status] = c;
    }

    const tasksDone = tasksByStatus.done ?? 0;
    const requirementsImplemented = requirementsByStatus.implemented ?? 0;

    const activityByEntity: Record<string, number> = {};
    let activitiesLast7Days = 0;
    for (const row of activityGroups) {
      const c = groupByCountAll(row);
      activitiesLast7Days += c;
      activityByEntity[row.entityType] = c;
    }

    return {
      project,
      organization,
      team,
      stats: {
        totalTasks,
        tasksDone,
        totalRequirements,
        requirementsImplemented,
        totalDocumentations: project._count.documentations,
        memberCount: team.length,
        activitiesLast7Days,
      },
      tasksByStatus,
      requirementsByStatus,
      activityByEntity,
      progress: {
        taskCompletionPercent: totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0,
        requirementCompletionPercent:
          totalRequirements > 0
            ? Math.round((requirementsImplemented / totalRequirements) * 100)
            : 0,
      },
      highlights: {
        lastProjectUpdateAt: project.updatedAt,
        lastDocumentationUpdateAt: lastDocUpdate._max.updatedAt,
        lastActivityAt: lastActivity?.createdAt ?? null,
      },
      recentTasks,
      recentRequirements,
      recentDocumentations: recentDocs,
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
