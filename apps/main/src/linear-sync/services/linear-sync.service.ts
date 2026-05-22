import { Injectable } from "@nestjs/common";
import { LinearSyncRunStatus, LinearSyncRunType } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { LinearImportService, type SyncStats } from "./linear-import.service";
import { LinearExportService } from "./linear-export.service";
import { LinearMappingService } from "./linear-mapping.service";

@Injectable()
export class LinearSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importService: LinearImportService,
    private readonly exportService: LinearExportService,
    private readonly mappingService: LinearMappingService,
  ) {}

  async import(organizationId: string, projectId: string) {
    const run = await this.importService.createSyncRun(projectId, LinearSyncRunType.import);
    try {
      const stats = await this.importService.importProject(organizationId, projectId, run.id, {
        full: true,
      });
      return { syncRunId: run.id, stats };
    } catch (e) {
      throw e;
    }
  }

  async export(organizationId: string, projectId: string) {
    const exportResult = await this.exportService.exportProject(organizationId, projectId);
    const { exportedLinearIssueIds: _exported, ...stats } = exportResult;
    const run = await this.prisma.linearSyncRun.create({
      data: {
        projectId,
        type: LinearSyncRunType.export,
        status: stats.failed > 0 ? "partial" : "completed",
        finishedAt: new Date(),
        stats: stats as object,
      },
    });
    return { syncRunId: run.id, stats };
  }

  async sync(organizationId: string, projectId: string) {
    await this.mappingService.requireMapping(organizationId, projectId);
    const run = await this.importService.createSyncRun(projectId, LinearSyncRunType.sync);

    let exportStats: SyncStats = { created: 0, updated: 0, skipped: 0, failed: 0 };
    let importStats: SyncStats = { created: 0, updated: 0, skipped: 0, failed: 0 };
    let skipLinearIssueIds = new Set<string>();

    try {
      const exportResult = await this.exportService.exportProject(organizationId, projectId);
      skipLinearIssueIds = new Set(exportResult.exportedLinearIssueIds);
      const { exportedLinearIssueIds: _exported, ...stats } = exportResult;
      exportStats = stats;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      await this.prisma.linearSyncRun.update({
        where: { id: run.id },
        data: {
          status: LinearSyncRunStatus.failed,
          finishedAt: new Date(),
          error: message,
          stats: exportStats as object,
        },
      });
      throw e;
    }

    try {
      importStats = await this.importService.importProject(organizationId, projectId, run.id, {
        skipLinearIssueIds,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Import failed";
      await this.prisma.linearSyncRun.update({
        where: { id: run.id },
        data: {
          status: LinearSyncRunStatus.partial,
          finishedAt: new Date(),
          error: message,
          stats: { export: exportStats, import: importStats } as object,
        },
      });
      throw e;
    }

    const combined: SyncStats = {
      created: exportStats.created + importStats.created,
      updated: exportStats.updated + importStats.updated,
      skipped: exportStats.skipped + importStats.skipped,
      failed: exportStats.failed + importStats.failed,
    };

    return { syncRunId: run.id, stats: combined, export: exportStats, import: importStats };
  }

  async listSyncRuns(projectId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [runs, totalItems] = await this.prisma.$transaction([
      this.prisma.linearSyncRun.findMany({
        where: { projectId },
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.linearSyncRun.count({ where: { projectId } }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      data: runs.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        stats: r.stats,
        error: r.error,
      })),
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
