import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "@app/prisma";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiRequirementsQueueProducer } from "./ai-requirements-queue.producer";
import {
  RagnarockChatAcceptedResponse,
  RagnarockChatQueuedJob,
  RagnarockChatResultEvent,
  RagnarockProjectSnapshot,
} from "./ai-requirements-queue.types";
import type { AgentPartialSrs } from "./types/agent-response.types";

@Injectable()
export class RagnarockChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcast: AiChatBroadcastService,
    private readonly queueProducer: AiRequirementsQueueProducer,
  ) {}

  // ─── Create a new session ─────────────────────────────────────────────────

  async createSession(params: {
    projectId: string;
    organizationId: string;
    userId: string;
  }): Promise<{ sessionId: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: params.projectId },
      select: { organizationId: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    if (project.organizationId !== params.organizationId) {
      throw new NotFoundException("Project not found");
    }

    const session = await this.prisma.ragnarockChatSession.create({
      data: { projectId: params.projectId, userId: params.userId, title: "New chat" },
    });

    return { sessionId: session.id };
  }

  // ─── Send a message ───────────────────────────────────────────────────────

  async sendMessage(params: {
    projectId: string;
    organizationId: string;
    userId: string;
    sessionId: string;
    message: string;
  }): Promise<RagnarockChatAcceptedResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: params.projectId },
      select: { name: true, description: true, status: true, organizationId: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    if (project.organizationId !== params.organizationId) {
      throw new NotFoundException("Project not found");
    }

    // Verify session belongs to this user/project
    const session = await this.prisma.ragnarockChatSession.findFirst({
      where: { id: params.sessionId, projectId: params.projectId, userId: params.userId },
      select: { id: true, title: true, _count: { select: { messages: true } } },
    });
    if (!session) throw new NotFoundException("Chat session not found");

    const snapshot = await this.buildProjectSnapshot(params.projectId, project);

    // Persist user message
    await this.prisma.ragnarockChatMessage.create({
      data: {
        sessionId: params.sessionId,
        projectId: params.projectId,
        userId: params.userId,
        role: "user",
        content: params.message,
      },
    });

    // Generate title from first message (runs in background, non-blocking)
    if (session._count.messages === 0 && session.title === "New chat") {
      void this.generateSessionTitle(params.sessionId, params.message);
    }

    const jobId = randomUUID();
    const job: RagnarockChatQueuedJob = {
      jobType: "ragnarock_chat",
      jobId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      userId: params.userId,
      sessionId: params.sessionId,
      message: params.message,
      projectSnapshot: snapshot,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    };

    await this.queueProducer.enqueueRagnarockChat(job);
    this.broadcast.emitToProject(params.projectId, "ragnarock_chat_processing", { jobId });

    return { jobId, status: "queued" };
  }

  // ─── Handle result ────────────────────────────────────────────────────────

  async handleResult(result: RagnarockChatResultEvent): Promise<void> {
    if (result.status === "ragnarock_chat_failed") {
      this.broadcast.emitToProject(result.projectId, "ragnarock_chat_failed", {
        jobId: result.jobId,
        error: result.error,
      });
      return;
    }

    await this.prisma.ragnarockChatMessage.create({
      data: {
        sessionId: result.sessionId,
        projectId: result.projectId,
        userId: result.userId,
        role: "assistant",
        content: result.answer,
        detectedAction: result.detectedAction ?? undefined,
      },
    });

    // Touch session updatedAt so it floats to top of history list
    await this.prisma.ragnarockChatSession.update({
      where: { id: result.sessionId },
      data: { updatedAt: new Date() },
    });

    this.broadcast.emitToProject(result.projectId, "ragnarock_chat_completed", {
      jobId: result.jobId,
      answer: result.answer,
      detectedAction: result.detectedAction ?? null,
    });
  }

  // ─── List sessions ────────────────────────────────────────────────────────

  async listSessions(params: { projectId: string; userId: string }) {
    const sessions = await this.prisma.ragnarockChatSession.findMany({
      where: { projectId: params.projectId, userId: params.userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      messageCount: s._count.messages,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  // ─── Get session messages ─────────────────────────────────────────────────

  async getSessionMessages(params: { sessionId: string; projectId: string; userId: string }) {
    const session = await this.prisma.ragnarockChatSession.findFirst({
      where: { id: params.sessionId, projectId: params.projectId, userId: params.userId },
      select: { id: true, title: true },
    });
    if (!session) throw new NotFoundException("Chat session not found");

    const messages = await this.prisma.ragnarockChatMessage.findMany({
      where: { sessionId: params.sessionId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, detectedAction: true, createdAt: true },
    });

    return {
      session: { id: session.id, title: session.title },
      messages: messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  // ─── Title generation ─────────────────────────────────────────────────────

  private async generateSessionTitle(sessionId: string, firstMessage: string): Promise<void> {
    try {
      const title = firstMessage.trim().slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
      await this.prisma.ragnarockChatSession.update({
        where: { id: sessionId },
        data: { title },
      });
    } catch {
      // Non-critical — title stays as "New chat"
    }
  }

  // ─── Project snapshot builder ─────────────────────────────────────────────

  private async buildProjectSnapshot(
    projectId: string,
    project: { name: string; description: string | null; status: string },
  ): Promise<RagnarockProjectSnapshot> {
    const [tasks, docs, members, activities, completedSpec] = await Promise.all([
      this.prisma.projectTask.findMany({
        where: { projectId },
        select: {
          id: true,
          title: true,
          status: true,
          phase: true,
          priority: true,
          assignee: { select: { name: true } },
        },
        orderBy: { sortOrder: "asc" },
        take: 50,
      }),
      this.prisma.projectDocumentation.findMany({
        where: { projectId },
        select: { id: true, title: true, type: true, status: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      this.prisma.projectMember.findMany({
        where: { projectId },
        select: {
          userId: true,
          role: true,
          personas: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.projectActivity.findMany({
        where: { projectId },
        select: {
          action: true,
          entityType: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      this.prisma.projectSpecification.findFirst({
        where: { projectId },
        select: { payload: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    let srsSummary: string | null = null;
    if (completedSpec) {
      const payload = completedSpec.payload as AgentPartialSrs | null;
      if (payload?.project_name || payload?.features?.length) {
        const featureNames = (payload.features ?? [])
          .slice(0, 8)
          .map((f) => f.name)
          .filter(Boolean)
          .join(", ");
        srsSummary = [
          payload.project_name ? `Project: ${payload.project_name}` : null,
          featureNames ? `Features: ${featureNames}` : null,
        ]
          .filter(Boolean)
          .join(". ")
          .slice(0, 500);
      }
    }

    return {
      projectId,
      name: project.name,
      description: project.description,
      status: project.status,
      hasSrs: !!completedSpec,
      srsSummary,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        phase: t.phase ?? null,
        priority: t.priority,
        assigneeName: t.assignee?.name ?? null,
      })),
      docs: docs.map((d) => ({ id: d.id, title: d.title, type: d.type, status: d.status })),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.user?.name ?? null,
        email: m.user?.email ?? null,
        role: m.role,
        personas: m.personas as string[],
      })),
      recentActivity: activities.map((a) => ({
        action: a.action,
        entityType: a.entityType,
        actorName: a.actor?.name ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}
