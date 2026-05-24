import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

const ACTIVE_STATUSES = ["backlog", "todo", "in_progress"] as const;

@Injectable()
export class TasksTool {
  constructor(private readonly prisma: PrismaService) {}

  async getNextTask(projectId: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { projectId, status: { in: [...ACTIVE_STATUSES] } },
      orderBy: { sortOrder: "asc" },
      include: {
        feature: { select: { externalId: true, name: true } },
      },
    });

    if (!task) return { message: "All tasks are complete — nothing left to build." };

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      phase: task.phase,
      status: task.status,
      featureId: task.feature?.externalId ?? null,
      featureName: task.feature?.name ?? null,
      labels: task.labels,
      sortOrder: task.sortOrder,
    };
  }

  async getTaskDetail(projectId: string, taskId: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, projectId },
      include: {
        feature: {
          include: {
            requirements: {
              select: { externalId: true, title: true, status: true },
              orderBy: { externalId: "asc" },
            },
          },
        },
      },
    });

    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      phase: task.phase,
      status: task.status,
      labels: task.labels,
      feature: task.feature
        ? {
            id: task.feature.externalId,
            name: task.feature.name,
            description: task.feature.description,
            requirements: task.feature.requirements.map((r) => ({
              id: r.externalId,
              title: r.title,
              status: r.status,
            })),
          }
        : null,
    };
  }

  async markTaskComplete(projectId: string, taskId: string, prUrl?: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });

    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    await this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status: "done",
        labels: prUrl
          ? { push: [`pr:${prUrl}`] }
          : undefined,
      },
    });

    const next = await this.getNextTask(projectId);

    return {
      taskId,
      status: "done",
      nextTask: "message" in next ? null : next,
    };
  }
}
