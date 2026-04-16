import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import {
  CreateProjectDocumentationDto,
  ListProjectDocumentationsQueryDto,
  UpdateProjectDocumentationDto,
} from "./dto/project-documentation.dto";

@Injectable()
export class ProjectDocumentationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(projectId: string, query: ListProjectDocumentationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { projectId, type: query.type };
    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.projectDocumentation.findMany({
        where,
        skip,
        take: limit,
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      this.prismaService.projectDocumentation.count({ where }),
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

  async create(projectId: string, userId: string, dto: CreateProjectDocumentationDto) {
    const documentation = await this.prismaService.projectDocumentation.create({
      data: {
        projectId,
        createdBy: userId,
        title: dto.title.trim(),
        type: dto.type,
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
      select: { version: true },
    });
    const documentation = await this.prismaService.projectDocumentation.update({
      where: { id: documentationId },
      data: {
        title: dto.title?.trim(),
        type: dto.type,
        content: dto.content,
        version: dto.content !== undefined ? (current?.version ?? 1) + 1 : undefined,
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
