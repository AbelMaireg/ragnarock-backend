import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

@Injectable()
export class ArchitectureTool {
  constructor(private readonly prisma: PrismaService) {}

  async getArchitectureDocs(projectId: string) {
    const docs = await this.prisma.projectDocumentation.findMany({
      where: { projectId, generationMode: "ai" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        content: true,
        updatedAt: true,
      },
    });

    if (!docs.length) {
      return { error: "No architecture documents found. Generate SAD/HLD/LLD documents from the dashboard first." };
    }

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      status: d.status,
      content: d.content,
      updatedAt: d.updatedAt,
    }));
  }

  async getArchitectureDoc(projectId: string, docId: string) {
    const doc = await this.prisma.projectDocumentation.findFirst({
      where: { id: docId, projectId },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        content: true,
        updatedAt: true,
      },
    });

    if (!doc) {
      return { error: `Document "${docId}" not found. Use get_architecture_docs to list available documents.` };
    }

    return doc;
  }
}
