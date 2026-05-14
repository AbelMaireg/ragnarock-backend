import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import { AiChatMessageRole, Prisma, ProjectMemberRole } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { UploaderService } from "@app/uploader";
import { ProjectAccessService } from "../project-auth/project-access.service";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiRequirementsQueueProducer } from "./ai-requirements-queue.producer";
import {
  AiProjectContext,
  AiRequirementsAcceptedResponse,
  AiRequirementsQueuedUpload,
} from "./ai-requirements-queue.types";
import {
  type AgentOrchestratorResponse,
  type AgentPartialSrs,
  computeSrsProgress,
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

    const [conversation_history, partialSrs, projectContext] = await Promise.all([
      this.conversationHistoryBeforeNewTurn(params.sessionId),
      this.getSessionPartialSrs(params.sessionId, params.projectId),
      this.getProjectContext(params.projectId),
    ]);

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
      partialSrs: partialSrs ?? undefined,
      projectContext,
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

    const [conversation_history, partialSrs, upload, projectContext] = await Promise.all([
      this.conversationHistoryBeforeNewTurn(params.sessionId),
      this.getSessionPartialSrs(params.sessionId, params.projectId),
      this.storeUpload(params.file),
      this.getProjectContext(params.projectId),
    ]);

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
      partialSrs: partialSrs ?? undefined,
      projectContext,
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
      const markdownContent = specToMarkdown(agent);

      // Find any existing spec + doc for this project so we upsert rather than accumulate
      const [existingSpec, existingDoc] = await Promise.all([
        this.prismaService.projectSpecification.findFirst({
          where: { projectId: params.projectId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        }),
        this.prismaService.projectDocumentation.findFirst({
          where: { projectId: params.projectId, type: "srs" },
          orderBy: { createdAt: "asc" },
          select: { id: true, version: true },
        }),
      ]);

      const specUpsert = existingSpec
        ? this.prismaService.projectSpecification.update({
            where: { id: existingSpec.id },
            data: {
              chatSessionId: params.sessionId,
              title: agent.project_name,
              payload: payloadJson,
              updatedAt: new Date(),
            },
          })
        : this.prismaService.projectSpecification.create({
            data: {
              projectId: params.projectId,
              chatSessionId: params.sessionId,
              createdBy: params.userId,
              title: agent.project_name,
              payload: payloadJson,
            },
          });

      const docUpsert = existingDoc
        ? this.prismaService.projectDocumentation.update({
            where: { id: existingDoc.id },
            data: {
              title: `${agent.project_name} — SRS`,
              content: markdownContent,
              status: "completed",
              version: existingDoc.version + 1,
              updatedAt: new Date(),
            },
          })
        : this.prismaService.projectDocumentation.create({
            data: {
              projectId: params.projectId,
              createdBy: params.userId,
              title: `${agent.project_name} — SRS`,
              type: "srs",
              status: "completed",
              content: markdownContent,
            },
          });

      const [spec] = await Promise.all([
        specUpsert,
        docUpsert,
        this.prismaService.projectAiChatSession.update({
          where: { id: params.sessionId },
          data: { updatedAt: new Date(), srsProgress: 100, partialSrs: Prisma.DbNull },
        }),
      ]);
      specificationId = spec.id;
    } else {
      // needs_clarification — persist the partial SRS back to the session
      const partial = agent.partial_srs as unknown as Prisma.InputJsonValue;
      const progress = computeSrsProgress(agent.partial_srs as AgentPartialSrs);
      await this.prismaService.projectAiChatSession.update({
        where: { id: params.sessionId },
        data: { updatedAt: new Date(), partialSrs: partial, srsProgress: progress },
      });
    }

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

  private async getProjectContext(projectId: string): Promise<AiProjectContext> {
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId },
      select: { name: true, description: true },
    });
    return { name: project?.name ?? projectId, description: project?.description };
  }

  private async getSessionPartialSrs(
    sessionId: string,
    projectId: string,
  ): Promise<AgentPartialSrs | null> {
    const session = await this.prismaService.projectAiChatSession.findUnique({
      where: { id: sessionId },
      select: { partialSrs: true },
    });

    // Session already has in-progress partial SRS — use it directly
    if (session?.partialSrs) {
      return session.partialSrs as unknown as AgentPartialSrs;
    }

    // No session-level partial — fall back to the latest completed spec for the project
    // so the agent continues building on existing work rather than starting from scratch
    const latestSpec = await this.prismaService.projectSpecification.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    });

    if (!latestSpec?.payload) return null;

    const p = latestSpec.payload as Record<string, unknown>;
    const partial: AgentPartialSrs = {
      project_name: (p.project_name as string) ?? undefined,
      summary: (p.summary as string) ?? undefined,
      features: (p.features as AgentPartialSrs["features"]) ?? undefined,
      user_roles: (p.user_roles as string[]) ?? undefined,
      functional_requirements: (p.functional_requirements as string[]) ?? undefined,
      non_functional_requirements: (p.non_functional_requirements as string[]) ?? undefined,
      user_stories: (p.user_stories as AgentPartialSrs["user_stories"]) ?? undefined,
      acceptance_criteria: (p.acceptance_criteria as string[]) ?? undefined,
      out_of_scope: (p.out_of_scope as string[]) ?? undefined,
    };
    return partial;
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
    return agent.questions.length === 1
      ? agent.questions[0]
      : agent.questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n");
  }
  return `${agent.project_name}\n\n${agent.summary}`;
}

function specToMarkdown(agent: Extract<AgentOrchestratorResponse, { status: "complete" }>): string {
  const lines: string[] = [];
  lines.push(`# ${agent.project_name}`);
  lines.push(`\n## Summary\n\n${agent.summary}`);

  if (agent.features.length > 0) {
    lines.push("\n## Features");
    for (const f of agent.features) {
      lines.push(`\n### ${f.name}\n\n${f.description}`);
    }
  }

  if (agent.user_stories.length > 0) {
    lines.push("\n## User Stories");
    for (const us of agent.user_stories) {
      lines.push(`\n- As a **${us.role}**, I want to ${us.goal}, so that ${us.benefit}.`);
    }
  }

  if (agent.functional_requirements.length > 0) {
    lines.push("\n## Functional Requirements");
    for (const fr of agent.functional_requirements) {
      lines.push(`\n- ${fr}`);
    }
  }

  if (agent.non_functional_requirements.length > 0) {
    lines.push("\n## Non-Functional Requirements");
    for (const nfr of agent.non_functional_requirements) {
      lines.push(`\n- ${nfr}`);
    }
  }

  if (agent.acceptance_criteria.length > 0) {
    lines.push("\n## Acceptance Criteria");
    for (const ac of agent.acceptance_criteria) {
      lines.push(`\n- ${ac}`);
    }
  }

  if (agent.out_of_scope && agent.out_of_scope.length > 0) {
    lines.push("\n## Out of Scope");
    for (const oos of agent.out_of_scope) {
      lines.push(`\n- ${oos}`);
    }
  }

  if (agent.business_owner_summary) {
    lines.push(`\n## Executive Summary\n\n${agent.business_owner_summary}`);
  }

  return lines.join("\n");
}
