import { Injectable, NotFoundException } from "@nestjs/common";
import { DocumentationStatus, Prisma } from "@prisma/client";
import { PaginatedResponseBase } from "@app/common";
import { PrismaService } from "@app/prisma";
import {
  CreateProjectDocumentationDto,
  ListProjectDocumentationsQueryDto,
  UpdateProjectDocumentationDto,
} from "./dto/project-documentation.dto";

const authorSelect = { select: { id: true, name: true, email: true } } as const;

export type ProjectDocumentationWithAuthor = Prisma.ProjectDocumentationGetPayload<{
  include: { author: typeof authorSelect };
}>;

@Injectable()
export class ProjectDocumentationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(
    projectId: string,
    query: ListProjectDocumentationsQueryDto,
  ): Promise<PaginatedResponseBase<ProjectDocumentationWithAuthor>> {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 20;
    const skip = (page - 1) * perPage;

    const where: Prisma.ProjectDocumentationWhereInput = {
      projectId,
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { title: { contains: query.search.trim(), mode: "insensitive" } },
              { content: { contains: query.search.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.projectDocumentation.findMany({
        where,
        skip,
        take: perPage,
        include: { author: authorSelect },
        orderBy: { updatedAt: "desc" },
      }),
      this.prismaService.projectDocumentation.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);

    return {
      items,
      page,
      perPage,
      total,
      totalPages,
    };
  }

  async findOne(projectId: string, documentationId: string): Promise<ProjectDocumentationWithAuthor> {
    const doc = await this.prismaService.projectDocumentation.findFirst({
      where: { id: documentationId, projectId },
      include: { author: authorSelect },
    });
    if (!doc) {
      throw new NotFoundException("Documentation not found");
    }
    return doc;
  }

  async create(projectId: string, userId: string, dto: CreateProjectDocumentationDto) {
    const documentation = await this.prismaService.projectDocumentation.create({
      data: {
        projectId,
        createdBy: userId,
        title: dto.title.trim(),
        type: dto.type,
        status: dto.status ?? DocumentationStatus.draft,
        content: dto.content,
      },
    });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "documentation.created",
        entityType: "documentation",
        entityId: documentation.id,
      },
    });
    return documentation;
  }

  async update(
    projectId: string,
    documentationId: string,
    dto: UpdateProjectDocumentationDto,
    userId: string,
  ) {
    await this.ensureDocumentation(projectId, documentationId);
    const current = await this.prismaService.projectDocumentation.findUnique({
      where: { id: documentationId },
      select: { version: true, content: true },
    });
    const contentChanged = dto.content !== undefined && dto.content !== current?.content;
    const documentation = await this.prismaService.projectDocumentation.update({
      where: { id: documentationId },
      data: {
        title: dto.title?.trim(),
        type: dto.type,
        status: dto.status,
        content: dto.content,
        version: contentChanged ? (current?.version ?? 1) + 1 : undefined,
      },
    });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "documentation.updated",
        entityType: "documentation",
        entityId: documentationId,
      },
    });
    return documentation;
  }

  async remove(projectId: string, documentationId: string, userId: string) {
    await this.ensureDocumentation(projectId, documentationId);
    await this.prismaService.projectDocumentation.delete({ where: { id: documentationId } });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "documentation.deleted",
        entityType: "documentation",
        entityId: documentationId,
      },
    });
    return { success: true };
  }

  private async ensureDocumentation(projectId: string, documentationId: string) {
    const doc = await this.prismaService.projectDocumentation.findFirst({
      where: { id: documentationId, projectId },
      select: { id: true },
    });
    if (!doc) {
      throw new NotFoundException("Documentation not found");
    }
  }
}
