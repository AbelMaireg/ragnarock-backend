import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "@app/prisma";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiRequirementsQueueProducer } from "./ai-requirements-queue.producer";
import {
  AiArchDocAcceptedResponse,
  AiArchDocQueuedJob,
  AiArchDocResultEvent,
  ArchDocType,
} from "./ai-requirements-queue.types";
import type { AgentPartialSrs } from "./types/agent-response.types";

@Injectable()
export class AiArchDocService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcast: AiChatBroadcastService,
    private readonly queueProducer: AiRequirementsQueueProducer,
  ) {}

  async requestGeneration(params: {
    projectId: string;
    organizationId: string;
    userId: string;
    docType: ArchDocType;
    layer?: string;
  }): Promise<AiArchDocAcceptedResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: params.projectId },
      select: { name: true, description: true, organizationId: true },
    });

    if (!project) throw new NotFoundException("Project not found");
    if (project.organizationId !== params.organizationId) {
      throw new NotFoundException("Project not found");
    }

    // Gate: a completed SRS must exist before architecture docs can be generated
    const completedSpec = await this.prisma.projectSpecification.findFirst({
      where: { projectId: params.projectId },
      select: { id: true, payload: true },
      orderBy: { createdAt: "desc" },
    });

    if (!completedSpec) {
      throw new UnprocessableEntityException(
        "No completed SRS found for this project. Complete the requirements session before generating architecture documents.",
      );
    }

    const jobId = randomUUID();
    const job: AiArchDocQueuedJob = {
      jobType: "arch_doc",
      jobId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      userId: params.userId,
      docType: params.docType,
      layer: params.layer,
      projectContext: { name: project.name, description: project.description },
      partialSrs: (completedSpec.payload as AgentPartialSrs) ?? undefined,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    };

    await this.queueProducer.enqueueArchDoc(job);

    this.broadcast.emitToProject(params.projectId, "arch_doc_processing", {
      jobId,
      docType: params.docType,
      layer: params.layer,
    });

    return { jobId, status: "queued" };
  }

  async completeGeneration(result: AiArchDocResultEvent): Promise<void> {
    if (result.status === "arch_doc_failed") {
      this.broadcast.emitToProject(result.projectId, "arch_doc_failed", {
        jobId: result.jobId,
        error: result.error,
      });
      return;
    }

    // Upsert: one doc per (project, docType, layer) combination
    const layerSuffix = result.layer ? ` — ${result.layer}` : "";
    const title = result.title || `${result.docType.toUpperCase()}${layerSuffix}`;

    const existing = await this.prisma.projectDocumentation.findFirst({
      where: {
        projectId: result.projectId,
        type: result.docType,
        title,
      },
      select: { id: true, version: true },
    });

    const doc = existing
      ? await this.prisma.projectDocumentation.update({
          where: { id: existing.id },
          data: {
            content: result.content,
            status: "completed",
            version: existing.version + 1,
            generationMode: "ai",
            sourceAgentKey: "developer_intelligence",
            updatedAt: new Date(),
          },
        })
      : await this.prisma.projectDocumentation.create({
          data: {
            projectId: result.projectId,
            createdBy: result.userId,
            title,
            type: result.docType,
            status: "completed",
            content: result.content,
            generationMode: "ai",
            sourceAgentKey: "developer_intelligence",
          },
        });

    this.broadcast.emitToProject(result.projectId, "arch_doc_completed", {
      jobId: result.jobId,
      documentationId: doc.id,
      docType: result.docType,
      layer: result.layer,
      title: doc.title,
      content: result.content,
    });
  }
}
