import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import { ListProjectActivityQueryDto } from "./dto/project-activity.dto";

@Injectable()
export class ProjectActivityService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(projectId: string, query: ListProjectActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.projectActivity.findMany({
        where: { projectId },
        skip,
        take: limit,
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prismaService.projectActivity.count({
        where: { projectId },
      }),
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
}
