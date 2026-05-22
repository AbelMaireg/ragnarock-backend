import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DocumentationStatus, DocumentationType } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { LoggerService } from "@app/logger";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiRequirementsQueueProducer } from "./ai-requirements-queue.producer";
import {
  AiQaIntelligenceAcceptedResponse,
  AiQaIntelligenceQueuedJob,
  AiQaIntelligenceResultEvent,
  AiQaIntelligenceSucceededResult,
} from "./ai-requirements-queue.types";
import type { AgentPartialSrs } from "./types/agent-response.types";

@Injectable()
export class AiQaIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcast: AiChatBroadcastService,
    private readonly queueProducer: AiRequirementsQueueProducer,
    private readonly logger: LoggerService,
  ) {}

  async requestGeneration(params: {
    projectId: string;
    organizationId: string;
    userId: string;
  }): Promise<AiQaIntelligenceAcceptedResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: params.projectId },
      select: { name: true, description: true, organizationId: true },
    });

    if (!project) throw new NotFoundException("Project not found");
    if (project.organizationId !== params.organizationId) {
      throw new NotFoundException("Project not found");
    }

    const completedSpec = await this.prisma.projectSpecification.findFirst({
      where: { projectId: params.projectId },
      select: { id: true, payload: true },
      orderBy: { createdAt: "desc" },
    });

    if (!completedSpec) {
      throw new UnprocessableEntityException(
        "No completed SRS found for this project. Complete the requirements session before generating test cases.",
      );
    }

    const srsPayload = completedSpec.payload as AgentPartialSrs;
    const jobId = randomUUID();

    const job: AiQaIntelligenceQueuedJob = {
      jobType: "qa_intelligence",
      jobId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      userId: params.userId,
      projectContext: { name: project.name, description: project.description },
      partialSrs: srsPayload,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    };

    await this.queueProducer.enqueueQaIntelligence(job);

    this.logger.log(
      `AiQaIntelligenceService | test generation queued | jobId=${jobId} | project=${params.projectId}`,
      AiQaIntelligenceService.name,
    );

    return { jobId, status: "queued" };
  }

  async handleResult(result: AiQaIntelligenceResultEvent): Promise<void> {
    if (result.status === "qa_intelligence_failed") {
      this.logger.warn(
        `AiQaIntelligenceService | job failed | jobId=${result.jobId} | error=${result.error}`,
        AiQaIntelligenceService.name,
      );
      this.broadcast.emitToProject(result.projectId, "qa_intelligence_failed", {
        jobId: result.jobId,
        error: result.error,
      });
      return;
    }

    await this.persistTestSuite(result as AiQaIntelligenceSucceededResult);
  }

  private async persistTestSuite(result: AiQaIntelligenceSucceededResult): Promise<void> {
    const doc = await this.prisma.projectDocumentation.create({
      data: {
        projectId: result.projectId,
        title: result.title,
        type: DocumentationType.stp,
        status: DocumentationStatus.completed,
        content: result.content,
        createdBy: result.userId,
        generationMode: "ai",
        sourceAgentKey: "qa_intelligence",
      },
      select: { id: true, title: true, type: true },
    });

    await this.prisma.projectActivity.create({
      data: {
        projectId: result.projectId,
        actorId: result.userId,
        action: "ai.qa.tests_generated",
        entityType: "documentation",
        entityId: doc.id,
        metadata: { title: doc.title },
      },
    });

    this.logger.log(
      `AiQaIntelligenceService | test suite persisted | docId=${doc.id} | project=${result.projectId}`,
      AiQaIntelligenceService.name,
    );

    this.broadcast.emitToProject(result.projectId, "qa_intelligence_completed", {
      jobId: result.jobId,
      documentationId: doc.id,
      title: doc.title,
    });
  }
}
