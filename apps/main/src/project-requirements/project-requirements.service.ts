import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import {
  CreateProjectRequirementDto,
  ListProjectRequirementsQueryDto,
  UpdateProjectRequirementDto,
} from "./dto/project-requirement.dto";

@Injectable()
export class ProjectRequirementsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(projectId: string, query: ListProjectRequirementsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = { projectId, status: query.status };
    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.projectRequirement.findMany({
        where,
        skip,
        take: limit,
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      this.prismaService.projectRequirement.count({ where }),
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

  async create(projectId: string, userId: string, dto: CreateProjectRequirementDto) {
    const requirement = await this.prismaService.projectRequirement.create({
      data: {
        projectId,
        createdBy: userId,
        title: dto.title.trim(),
        description: dto.description,
        acceptanceCriteria: dto.acceptanceCriteria ?? null,
        status: dto.status,
      },
    });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "requirement.created",
        entityType: "requirement",
        entityId: requirement.id,
      },
    });
    return requirement;
  }

  async update(
    projectId: string,
    requirementId: string,
    dto: UpdateProjectRequirementDto,
    userId: string,
  ) {
    await this.ensureRequirement(projectId, requirementId);
    const requirement = await this.prismaService.projectRequirement.update({
      where: { id: requirementId },
      data: {
        title: dto.title?.trim(),
        description: dto.description,
        acceptanceCriteria: dto.acceptanceCriteria,
        status: dto.status,
      },
    });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "requirement.updated",
        entityType: "requirement",
        entityId: requirementId,
      },
    });
    return requirement;
  }

  async remove(projectId: string, requirementId: string, userId: string) {
    await this.ensureRequirement(projectId, requirementId);
    await this.prismaService.projectRequirement.delete({ where: { id: requirementId } });
    await this.prismaService.projectActivity.create({
      data: {
        projectId,
        actorId: userId,
        action: "requirement.deleted",
        entityType: "requirement",
        entityId: requirementId,
      },
    });
    return { success: true };
  }

  private async ensureRequirement(projectId: string, requirementId: string) {
    const requirement = await this.prismaService.projectRequirement.findFirst({
      where: { id: requirementId, projectId },
      select: { id: true },
    });
    if (!requirement) {
      throw new NotFoundException("Requirement not found");
    }
  }
}
