import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { TaskStatus } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { LoggerService } from "@app/logger";
import { LinearExportService } from "../linear-sync/services/linear-export.service";
import { LinearMappingService } from "../linear-sync/services/linear-mapping.service";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiRequirementsQueueProducer } from "./ai-requirements-queue.producer";
import {
  AiPlannerAcceptedResponse,
  AiPlannerQueuedJob,
  AiPlannerSucceededResult,
  AiPlannerTask,
} from "./ai-requirements-queue.types";
import type { AgentPartialSrs } from "./types/agent-response.types";

@Injectable()
export class AiPlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcast: AiChatBroadcastService,
    private readonly queueProducer: AiRequirementsQueueProducer,
    private readonly linearExport: LinearExportService,
    private readonly linearMapping: LinearMappingService,
    private readonly logger: LoggerService,
  ) {}

  async requestGeneration(params: {
    projectId: string;
    organizationId: string;
    userId: string;
  }): Promise<AiPlannerAcceptedResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: params.projectId },
      select: { name: true, description: true, organizationId: true, draftSrs: true },
    });

    if (!project) throw new NotFoundException("Project not found");
    if (project.organizationId !== params.organizationId) {
      throw new NotFoundException("Project not found");
    }

    // Gate: a completed SRS must exist before a plan can be generated
    const completedSpec = await this.prisma.projectSpecification.findFirst({
      where: { projectId: params.projectId },
      select: { id: true, payload: true },
      orderBy: { createdAt: "desc" },
    });

    if (!completedSpec) {
      throw new UnprocessableEntityException(
        "No completed SRS found for this project. Complete the requirements session before generating a plan.",
      );
    }

    // Use the completed SRS payload as the planner input (richer than draftSrs)
    const srsPayload = completedSpec.payload as AgentPartialSrs;

    const jobId = randomUUID();
    const job: AiPlannerQueuedJob = {
      jobType: "planner",
      jobId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      userId: params.userId,
      projectContext: { name: project.name, description: project.description },
      partialSrs: srsPayload,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    };

    await this.queueProducer.enqueuePlanner(job);

    this.logger.log(
      `AiPlannerService | plan generation queued | jobId=${jobId} | project=${params.projectId}`,
      AiPlannerService.name,
    );

    return { jobId, status: "queued" };
  }

  async handlePlannerResult(result: AiPlannerSucceededResult): Promise<void> {
    const { projectId, userId, tasks } = result;

    if (!tasks.length) {
      this.logger.warn(
        `AiPlannerService | no tasks in result for project=${projectId}`,
        AiPlannerService.name,
      );
      return;
    }

    const created = await this.bulkCreateTasks(projectId, userId, tasks);

    this.logger.log(
      `AiPlannerService | created ${created} tasks for project=${projectId}`,
      AiPlannerService.name,
    );

    this.broadcast.emitToProject(projectId, "planner_completed", {
      jobId: result.jobId,
      taskCount: created,
    });

    await this.maybePushToLinear(projectId);
  }

  async handlePlannerFailed(result: { jobId: string; projectId: string; error: string }): Promise<void> {
    this.broadcast.emitToProject(result.projectId, "planner_failed", {
      jobId: result.jobId,
      error: result.error,
    });
  }

  private async bulkCreateTasks(
    projectId: string,
    userId: string,
    tasks: AiPlannerTask[],
  ): Promise<number> {
    // Sort by executionOrder so sortOrder on the board matches dependency sequence
    const sorted = [...tasks].sort((a, b) => a.executionOrder - b.executionOrder);

    await this.prisma.$transaction(
      sorted.map((task, index) =>
        this.prisma.projectTask.create({
          data: {
            projectId,
            title: task.title.trim().slice(0, 140),
            description: task.description?.trim().slice(0, 2000) || null,
            priority: task.priority as any,
            phase: task.phase as any,
            status: TaskStatus.backlog,
            labels: [
              // featureId tag for MCP Phase 5 traceability
              `feat:${task.featureId}`,
              ...(task.labels ?? []),
            ],
            sortOrder: index,
          },
        }),
      ),
    );

    await this.prisma.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "ai.planner.tasks_generated",
        entityType: "project",
        entityId: projectId,
        metadata: { taskCount: sorted.length },
      },
    });

    return sorted.length;
  }

  private async maybePushToLinear(projectId: string): Promise<void> {
    try {
      // Check if project has an active Linear mapping before attempting export
      const project = await this.prisma.project.findFirst({
        where: { id: projectId },
        include: { linearMapping: true },
      });

      if (!project?.linearMapping) {
        return;
      }

      const { organizationId } = project;

      this.logger.log(
        `AiPlannerService | Linear mapping found — exporting tasks for project=${projectId}`,
        AiPlannerService.name,
      );

      await this.linearExport.exportProject(organizationId, projectId);
    } catch (error) {
      // Linear push is best-effort — tasks are already created locally
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `AiPlannerService | Linear export failed (non-fatal): ${reason}`,
        AiPlannerService.name,
      );
    }
  }
}
