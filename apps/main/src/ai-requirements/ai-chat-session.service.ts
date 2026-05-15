import { Injectable, NotFoundException } from "@nestjs/common";
import { AgentType } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import {
  ListAiChatMessagesQueryDto,
  ListAiChatSessionsQueryDto,
} from "./dto/ai-chat.dto";

@Injectable()
export class AiChatSessionService {
  constructor(private readonly prismaService: PrismaService) {}

  /** The project's single shared draft SRS — what every new chat continues from. */
  async getProjectDraft(projectId: string) {
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId },
      select: { draftSrs: true, draftSrsProgress: true },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return {
      draftSrs: project.draftSrs ?? null,
      draftSrsProgress: project.draftSrsProgress,
    };
  }

  async createSession(
    projectId: string,
    userId: string,
    title?: string | null,
    agentType: AgentType = AgentType.requirements,
  ) {
    return this.prismaService.projectAiChatSession.create({
      data: {
        projectId,
        createdBy: userId,
        title: title?.trim() || null,
        agentType,
      },
    });
  }

  async listSessions(projectId: string, query: ListAiChatSessionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.projectAiChatSession.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          author: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true } },
        },
        // partialSrs and srsProgress are selected by default (scalar fields)
      }),
      this.prismaService.projectAiChatSession.count({ where: { projectId } }),
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

  async listMessages(projectId: string, sessionId: string, query: ListAiChatMessagesQueryDto) {
    await this.ensureSessionInProject(projectId, sessionId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.projectAiChatMessage.findMany({
        where: { sessionId },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
      }),
      this.prismaService.projectAiChatMessage.count({ where: { sessionId } }),
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

  private async ensureSessionInProject(projectId: string, sessionId: string) {
    const session = await this.prismaService.projectAiChatSession.findFirst({
      where: { id: sessionId, projectId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException("Chat session not found");
    }
  }
}
