import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TaskStatus } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import {
  CreateProjectTaskDto,
  ListProjectTasksQueryDto,
  ReorderProjectTasksDto,
  UpdateProjectTaskDto,
} from "./dto/project-task.dto";

const taskAssigneeInclude = {
  assignee: { select: { id: true, name: true, email: true, image: true } },
} satisfies Prisma.ProjectTaskInclude;

@Injectable()
export class ProjectTasksService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(projectId: string, query: ListProjectTasksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();
    const where: Prisma.ProjectTaskWhereInput = {
      projectId,
      status: query.status,
      phase: query.phase,
      assigneeId: query.assigneeId || undefined,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.projectTask.findMany({
        where,
        skip,
        take: limit,
        include: taskAssigneeInclude,
        orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      }),
      this.prismaService.projectTask.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
    return {
      data,
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

  async getById(projectId: string, taskId: string) {
    const task = await this.prismaService.projectTask.findFirst({
      where: { id: taskId, projectId },
      include: taskAssigneeInclude,
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return task;
  }

  async create(projectId: string, userId: string, dto: CreateProjectTaskDto) {
    await this.ensureAssigneeIsProjectMember(projectId, dto.assigneeId);

    const status = dto.status ?? TaskStatus.todo;
    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(projectId, status));

    const task = await this.prismaService.projectTask.create({
      data: {
        projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        priority: dto.priority,
        status,
        phase: dto.phase ?? undefined,
        assigneeId: dto.assigneeId || null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        sortOrder,
      },
      include: taskAssigneeInclude,
    });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "task.created",
        entityType: "task",
        entityId: task.id,
      },
    });
    return task;
  }

  async update(projectId: string, taskId: string, dto: UpdateProjectTaskDto, userId: string) {
    await this.ensureProjectTask(projectId, taskId);
    await this.ensureAssigneeIsProjectMember(projectId, dto.assigneeId ?? undefined);

    const task = await this.prismaService.projectTask.update({
      where: { id: taskId },
      data: {
        title: dto.title?.trim(),
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        status: dto.status,
        priority: dto.priority,
        phase: dto.phase === null ? null : dto.phase,
        assigneeId: dto.assigneeId === null ? null : (dto.assigneeId ?? undefined),
        startDate:
          dto.startDate === null ? null : dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate === null ? null : dto.dueDate ? new Date(dto.dueDate) : undefined,
        sortOrder: dto.sortOrder,
      },
      include: taskAssigneeInclude,
    });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "task.updated",
        entityType: "task",
        entityId: taskId,
      },
    });
    return task;
  }

  async reorder(projectId: string, dto: ReorderProjectTasksDto, userId: string) {
    const ids = dto.updates.map((u) => u.id);
    const tasks = await this.prismaService.projectTask.findMany({
      where: { projectId, id: { in: ids } },
      select: { id: true },
    });
    if (tasks.length !== ids.length) {
      throw new BadRequestException("One or more tasks are invalid for this project");
    }

    await this.prismaService.$transaction(
      dto.updates.map((u) =>
        this.prismaService.projectTask.update({
          where: { id: u.id, projectId },
          data: {
            sortOrder: u.sortOrder,
            ...(u.status !== undefined ? { status: u.status } : {}),
          },
        }),
      ),
    );

    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "task.reordered",
        entityType: "task",
        entityId: ids[0] ?? null,
        metadata: { taskIds: ids },
      },
    });

    return { success: true };
  }

  async remove(projectId: string, taskId: string, userId: string) {
    await this.ensureProjectTask(projectId, taskId);
    await this.prismaService.projectTask.delete({ where: { id: taskId } });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "task.deleted",
        entityType: "task",
        entityId: taskId,
      },
    });
    return { success: true };
  }

  private async nextSortOrder(projectId: string, status: TaskStatus): Promise<number> {
    const agg = await this.prismaService.projectTask.aggregate({
      where: { projectId, status },
      _max: { sortOrder: true },
    });
    return (agg._max.sortOrder ?? -1) + 1;
  }

  private async ensureAssigneeIsProjectMember(projectId: string, assigneeId?: string | null) {
    if (!assigneeId) {
      return;
    }
    const member = await this.prismaService.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException("Assignee must be a member of this project");
    }
  }

  private async ensureProjectTask(projectId: string, taskId: string) {
    const task = await this.prismaService.projectTask.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
  }
}
