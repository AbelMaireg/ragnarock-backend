import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

@Injectable()
export class TestCasesTool {
  constructor(private readonly prisma: PrismaService) {}

  async getTestCases(projectId: string, featureId: string) {
    const feature = await this.prisma.projectFeature.findFirst({
      where: { projectId, externalId: featureId },
      select: { id: true, name: true },
    });

    if (!feature) {
      return { error: `Feature "${featureId}" not found. Use get_features to see valid feature IDs.` };
    }

    const testCases = await this.prisma.projectTestCase.findMany({
      where: { projectId, featureId: feature.id },
      orderBy: { externalId: "asc" },
    });

    return {
      featureId,
      featureName: feature.name,
      testCases: testCases.map((tc) => ({
        id: tc.externalId ?? tc.id,
        title: tc.title,
        type: tc.testType,
        preconditions: tc.preconditions,
        steps: tc.steps,
        expectedResult: tc.expectedResult,
      })),
    };
  }
}
