import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

@Injectable()
export class FeaturesTool {
  constructor(private readonly prisma: PrismaService) {}

  async getFeatures(projectId: string) {
    const features = await this.prisma.projectFeature.findMany({
      where: { projectId },
      orderBy: { externalId: "asc" },
      include: {
        requirements: {
          select: { externalId: true, title: true, status: true },
          orderBy: { externalId: "asc" },
        },
        _count: { select: { tasks: true, testCases: true } },
      },
    });

    return features.map((f) => ({
      id: f.externalId,
      name: f.name,
      description: f.description,
      taskCount: f._count.tasks,
      testCaseCount: f._count.testCases,
      requirementCount: f.requirements.length,
      requirements: f.requirements.map((r) => ({
        id: r.externalId,
        title: r.title,
        status: r.status,
      })),
    }));
  }
}
