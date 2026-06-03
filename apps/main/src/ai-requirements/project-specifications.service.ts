import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import { ListProjectSpecificationsQueryDto } from "./dto/ai-chat.dto";

@Injectable()
export class ProjectSpecificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(projectId: string, query: ListProjectSpecificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.projectSpecification.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          projectId: true,
          chatSessionId: true,
          title: true,
          payload: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prismaService.projectSpecification.count({ where: { projectId } }),
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

  async findOne(projectId: string, specificationId: string) {
    const row = await this.prismaService.projectSpecification.findFirst({
      where: { id: specificationId, projectId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
    if (!row) {
      throw new NotFoundException("Specification not found");
    }
    return row;
  }
}
