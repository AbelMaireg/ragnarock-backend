import { Injectable, Logger } from "@nestjs/common";
import { LinearProjectSyncStatus, LinearSyncDirection, TaskStatus } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@app/prisma";
import { LinearGraphqlService } from "./linear-graphql.service";
import { LinearCredentialsResolver } from "./linear-credentials.resolver";
import { LinearMappingService } from "./linear-mapping.service";
import {
  resolveLinearStateIdForTaskStatus,
  resolveLabelIds,
  taskPriorityToLinearPriority,
} from "../mappers/linear-field.mapper";
import type { LinearWorkflowState } from "../validation/linear-issue.schema";
import type { SyncStats } from "./linear-import.service";

export type ExportResult = SyncStats & {
  /** Linear issue IDs written during this export (skip re-import in the same sync run). */
  exportedLinearIssueIds: string[];
};

@Injectable()
export class LinearExportService {
  private readonly logger = new Logger(LinearExportService.name);
  private readonly batchSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphql: LinearGraphqlService,
    private readonly credentials: LinearCredentialsResolver,
    private readonly mappingService: LinearMappingService,
    private readonly configService: ConfigService,
  ) {
    this.batchSize = this.configService.get<number>("linear.syncBatchSize", 25);
  }

  async exportProject(organizationId: string, projectId: string): Promise<ExportResult> {
    const mapping = await this.mappingService.requireMapping(organizationId, projectId);
    const pat = await this.credentials.resolvePat(organizationId);
    const stats: SyncStats = { created: 0, updated: 0, skipped: 0, failed: 0 };
    const exportedLinearIssueIds: string[] = [];

    await this.mappingService.setSyncStatus(projectId, LinearProjectSyncStatus.syncing);

    try {
      const workflowStates = await this.graphql.listWorkflowStates(pat, mapping.linearTeamId);
      const teamLabels = await this.graphql.listTeamLabels(pat, mapping.linearTeamId);
      const stateMap = (mapping.stateMap ?? {}) as Record<string, TaskStatus>;

      const tasks = await this.prisma.projectTask.findMany({
        where: { projectId },
        include: { linearLink: true },
        take: 500,
        orderBy: { updatedAt: "desc" },
      });

      const dirty = tasks.filter((t) => this.isDirty(t, t.linearLink));
      const batch = dirty.slice(0, this.batchSize);

      for (const task of batch) {
        try {
          const stateId = resolveLinearStateIdForTaskStatus(
            task.status,
            workflowStates as LinearWorkflowState[],
            stateMap,
            mapping.defaultLinearStateId,
            task.linearLink?.linearStateId ?? null,
          );
          if (!stateId) {
            throw new Error(`No Linear workflow state mapped for status "${task.status}"`);
          }
          const labelIds = resolveLabelIds(task.labels, teamLabels);
          const priority = taskPriorityToLinearPriority(task.priority);

          if (!task.linearLink) {
            const created = await this.graphql.createIssue(pat, {
              teamId: mapping.linearTeamId,
              projectId: mapping.linearProjectId,
              title: task.title,
              description: task.description,
              priority,
              stateId,
              dueDate: task.dueDate,
              labelIds,
            });

            await this.prisma.linearIssueLink.create({
              data: {
                projectId,
                projectTaskId: task.id,
                linearIssueId: created.id,
                linearIssueIdentifier: created.identifier,
                linearUpdatedAt: new Date(created.updatedAt),
                localUpdatedAt: task.updatedAt,
                syncDirection: LinearSyncDirection.export,
                importedFromLinear: false,
                syncedToLinear: true,
                lastSyncedAt: new Date(),
                linearStateId: stateId ?? null,
                labelIds,
              },
            });
            exportedLinearIssueIds.push(created.id);
            stats.created++;
          } else {
            const link = task.linearLink;
            if (!this.isDirty(task, link)) {
              stats.skipped++;
              continue;
            }

            const updated = await this.graphql.updateIssue(pat, link.linearIssueId, {
              title: task.title,
              description: task.description,
              priority,
              stateId,
              dueDate: task.dueDate,
              labelIds,
            });

            await this.prisma.linearIssueLink.update({
              where: { id: link.id },
              data: {
                linearIssueIdentifier: updated.identifier,
                linearUpdatedAt: new Date(updated.updatedAt),
                localUpdatedAt: task.updatedAt,
                syncedToLinear: true,
                lastSyncedAt: new Date(),
                linearStateId: stateId ?? null,
                labelIds,
                lastSyncError: null,
              },
            });
            exportedLinearIssueIds.push(link.linearIssueId);
            stats.updated++;
          }
        } catch (e) {
          stats.failed++;
          const message = e instanceof Error ? e.message : "Export failed";
          if (task.linearLink) {
            await this.prisma.linearIssueLink.update({
              where: { id: task.linearLink.id },
              data: { lastSyncError: message.slice(0, 500) },
            });
          }
          this.logger.warn(`Export failed for task ${task.id}: ${message}`);
        }
      }

      await this.prisma.linearProjectMapping.update({
        where: { projectId },
        data: {
          lastExportAt: new Date(),
          lastSyncAt: new Date(),
          syncStatus: LinearProjectSyncStatus.idle,
          lastSyncError: stats.failed > 0 ? `${stats.failed} task(s) failed to export` : null,
        },
      });

      return { ...stats, exportedLinearIssueIds };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      await this.mappingService.setSyncStatus(projectId, LinearProjectSyncStatus.error, message);
      throw e;
    }
  }

  private isDirty(
    task: {
      updatedAt: Date;
      title: string;
      description: string | null;
      status: string;
      priority: string;
    },
    link: { localUpdatedAt: Date | null } | null,
  ): boolean {
    if (!link) {
      return true;
    }
    if (!link.localUpdatedAt) {
      return true;
    }
    return task.updatedAt > link.localUpdatedAt;
  }
}
