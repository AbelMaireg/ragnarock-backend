import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

@Injectable()
export class SrsTool {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectSrs(projectId: string) {
    const spec = await this.prisma.projectSpecification.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { payload: true, title: true, updatedAt: true },
    });

    if (!spec) {
      return {
        error: "No completed SRS found for this project. Complete a requirements session first.",
      };
    }

    return {
      title: spec.title,
      updatedAt: spec.updatedAt,
      ...(spec.payload as object),
    };
  }
}
