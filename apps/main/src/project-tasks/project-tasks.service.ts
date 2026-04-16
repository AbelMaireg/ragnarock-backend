import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import { CreateProjectTaskDto, ListProjectTasksQueryDto, UpdateProjectTaskDto } from "./dto/project-task.dto";

@Injectable()
export class ProjectTasksService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(projectId: string, query: ListProjectTasksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { projectId, status: query.status };
    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.projectTask.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
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

  async create(projectId: string, userId: string, dto: CreateProjectTaskDto) {
    const task = await this.prismaService.projectTask.create({
      data: {
        projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        priority: dto.priority,
        status: dto.status,
        assigneeId: dto.assigneeId || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
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
    const task = await this.prismaService.projectTask.update({
      where: { id: taskId },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : dto.dueDate === null ? null : undefined,
      },
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
