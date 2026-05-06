import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import { AiChatMessageRole, type Prisma, ProjectMemberRole } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { UploaderService } from "@app/uploader";
import { ProjectAccessService } from "../project-auth/project-access.service";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiRequirementsQueueProducer } from "./ai-requirements-queue.producer";
import {
  AiRequirementsAcceptedResponse,
  AiRequirementsQueuedUpload,
} from "./ai-requirements-queue.types";
import {
  type AgentOrchestratorResponse,
  parseAgentResponse,
} from "./types/agent-response.types";

export type AiTurnCompletedPayload = {
  userMessageId: string;
  assistantMessageId: string;
  agent: AgentOrchestratorResponse;
  specificationId?: string;
};

@Injectable()
export class AiChatTurnService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly broadcastService: AiChatBroadcastService,
    private readonly queueProducer: AiRequirementsQueueProducer,
    private readonly uploaderService: UploaderService,
  ) {}

  async executeTextOrUrlTurn(params: {
    projectId: string;
    organizationId: string;
    userId: string;
    sessionId: string;
    input: string;
    type: "text" | "url";
  }): Promise<AiRequirementsAcceptedResponse> {
    await this.ensureSessionAndContributor(params);

    const conversation_history = await this.conversationHistoryBeforeNewTurn(params.sessionId);

    const userMessage = await this.prismaService.projectAiChatMessage.create({
      data: {
        sessionId: params.sessionId,
        role: AiChatMessageRole.user,
        content: params.input.trim(),
      },
    });

    this.broadcastService.emitToProjectSession(params.projectId, params.sessionId, "processing", {
      phase: "agent",
      userMessageId: userMessage.id,
    });

    const jobId = randomUUID();
    await this.queueProducer.enqueue({
      jobId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      userId: params.userId,
      sessionId: params.sessionId,
      userMessageId: userMessage.id,
      input: params.input.trim(),
      type: params.type,
      conversationHistory: conversation_history,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    });

    return { jobId, userMessageId: userMessage.id, status: "queued" };
  }

  async executeUploadTurn(params: {
    projectId: string;
    organizationId: string;
    userId: string;
    sessionId: string;
    file: Express.Multer.File;
  }): Promise<AiRequirementsAcceptedResponse> {
    await this.ensureSessionAndContributor(params);

    const conversation_history = await this.conversationHistoryBeforeNewTurn(params.sessionId);
    const upload = await this.storeUpload(params.file);

    const label = `[Uploaded file: ${params.file.originalname}]`;
    const userMessage = await this.prismaService.projectAiChatMessage.create({
      data: {
        sessionId: params.sessionId,
        role: AiChatMessageRole.user,
        content: label,
      },
    });

    this.broadcastService.emitToProjectSession(params.projectId, params.sessionId, "processing", {
      phase: "agent",
      userMessageId: userMessage.id,
    });

    const jobId = randomUUID();
    await this.queueProducer.enqueue({
      jobId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      userId: params.userId,
      sessionId: params.sessionId,
      userMessageId: userMessage.id,
      type: "upload",
      input: label,
      conversationHistory: conversation_history,
      upload,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    });

    return { jobId, userMessageId: userMessage.id, status: "queued" };
  }

  private async ensureSessionAndContributor(params: {
    projectId: string;
    organizationId: string;
    userId: string;
    sessionId: string;
  }) {
    const chatSession = await this.prismaService.projectAiChatSession.findFirst({
      where: { id: params.sessionId, projectId: params.projectId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!chatSession) {
      throw new NotFoundException("Chat session not found");
    }

    if (chatSession.project.organizationId !== params.organizationId) {
      throw new ForbiddenException("Chat session is not in the active organization");
    }

    const role = await this.projectAccessService.validateProjectMembership({
      projectId: params.projectId,
      userId: params.userId,
      organizationId: params.organizationId,
    });

    if (role === ProjectMemberRole.viewer) {
      throw new ForbiddenException("Viewers cannot run the AI agent");
    }
  }

  private async conversationHistoryBeforeNewTurn(sessionId: string) {
    const prior = await this.prismaService.projectAiChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return prior.map((m) => ({
      role: (m.role === AiChatMessageRole.user ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));
  }

  async completeQueuedTurn(params: {
    projectId: string;
    userId: string;
    sessionId: string;
    userMessageId: string;
    raw: unknown;
  }): Promise<AiTurnCompletedPayload> {
    let agent: AgentOrchestratorResponse;
    try {
      agent = parseAgentResponse(params.raw);
    } catch (err) {
      throw new BadGatewayException(
        err instanceof Error ? err.message : "Unexpected agent response shape",
      );
    }

    const assistantContent = assistantReadableContent(agent);
    const payloadJson = agent as unknown as Prisma.InputJsonValue;

    const assistantMessage = await this.prismaService.projectAiChatMessage.create({
      data: {
        sessionId: params.sessionId,
        role: AiChatMessageRole.assistant,
        content: assistantContent,
        payload: payloadJson,
      },
    });

    let specificationId: string | undefined;
    if (agent.status === "complete") {
      const spec = await this.prismaService.projectSpecification.create({
        data: {
          projectId: params.projectId,
          chatSessionId: params.sessionId,
          createdBy: params.userId,
          title: agent.project_name,
          payload: payloadJson,
        },
      });
      specificationId = spec.id;
    }

    await this.prismaService.projectAiChatSession.updateMany({
      where: { id: params.sessionId },
      data: { updatedAt: new Date() },
    });

    const completed: AiTurnCompletedPayload = {
      userMessageId: params.userMessageId,
      assistantMessageId: assistantMessage.id,
      agent,
      specificationId,
    };

    this.broadcastService.emitToProjectSession(
      params.projectId,
      params.sessionId,
      "turn_completed",
      completed,
    );

    return completed;
  }

  failQueuedTurn(params: {
    projectId: string;
    sessionId: string;
    userMessageId: string;
    jobId: string;
    error: string;
  }): void {
    this.broadcastService.emitToProjectSession(params.projectId, params.sessionId, "turn_failed", {
      jobId: params.jobId,
      userMessageId: params.userMessageId,
      error: params.error,
    });
  }

  private async storeUpload(file: Express.Multer.File): Promise<AiRequirementsQueuedUpload> {
    const filename = `${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploaded = await this.uploaderService.upload({
      buffer: file.buffer,
      filename,
      contentType: file.mimetype,
      directory: "ai-requirements",
    });

    return {
      key: uploaded.key,
      location: uploaded.location,
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
    };
  }
}

function assistantReadableContent(agent: AgentOrchestratorResponse): string {
  if (agent.status === "needs_clarification") {
    return agent.questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n");
  }
  return `${agent.project_name}\n\n${agent.summary}`;
}
