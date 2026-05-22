import { Injectable, Logger } from "@nestjs/common";
import {
  LinearProjectSyncStatus,
  LinearSyncDirection,
  LinearSyncRunStatus,
  LinearSyncRunType,
  Prisma,
  TaskStatus,
} from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@app/prisma";
import { LinearGraphqlService } from "./linear-graphql.service";
import { LinearCredentialsResolver } from "./linear-credentials.resolver";
import { LinearMappingService } from "./linear-mapping.service";
import {
  extractLabelNames,
  resolveTaskStatusFromLinearState,
  linearPriorityToTaskPriority,
  shouldApplyLinearImport,
} from "../mappers/linear-field.mapper";
import type { LinearIssueNode } from "../validation/linear-issue.schema";

export type SyncStats = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

@Injectable()
export class LinearImportService {
  private readonly logger = new Logger(LinearImportService.name);
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

  async importProject(
    organizationId: string,
    projectId: string,
    syncRunId?: string,
    options?: { full?: boolean; skipLinearIssueIds?: ReadonlySet<string> },
  ): Promise<SyncStats> {
    const mapping = await this.mappingService.requireMapping(organizationId, projectId);
    const pat = await this.credentials.resolvePat(organizationId);
    const stats: SyncStats = { created: 0, updated: 0, skipped: 0, failed: 0 };

    await this.mappingService.setSyncStatus(projectId, LinearProjectSyncStatus.syncing);

    try {
      const stateMap = (mapping.stateMap ?? {}) as Record<string, TaskStatus>;
      let cursor: string | undefined;
      let hasNext = true;
      let maxUpdatedAt = mapping.lastSyncCursor ?? new Date(0);
      const updatedAfter = options?.full ? undefined : (mapping.lastSyncCursor ?? undefined);

      while (hasNext) {
        const page = await this.graphql.fetchIssuesPage(pat, mapping.linearProjectId, {
          first: this.batchSize,
          after: cursor,
          updatedAfter,
        });

        for (const issue of page.issues) {
          try {
            if (options?.skipLinearIssueIds?.has(issue.id)) {
              stats.skipped++;
              if (issue.updatedAt > maxUpdatedAt) {
                maxUpdatedAt = issue.updatedAt;
              }
              continue;
            }

            const result = await this.upsertIssueFromLinear(
              projectId,
              issue,
              stateMap,
              organizationId,
            );
            if (result === "created") stats.created++;
            else if (result === "updated") stats.updated++;
            else stats.skipped++;
            if (issue.updatedAt > maxUpdatedAt) {
              maxUpdatedAt = issue.updatedAt;
            }
          } catch (e) {
            stats.failed++;
            this.logger.warn(
              `Import failed for Linear issue ${issue.id}: ${e instanceof Error ? e.message : e}`,
            );
          }
        }

        hasNext = page.hasNextPage;
        cursor = page.endCursor ?? undefined;

        if (page.issues.length === 0) {
          break;
        }
      }

      await this.prisma.linearProjectMapping.update({
        where: { projectId },
        data: {
          lastSyncCursor: maxUpdatedAt,
          lastImportAt: new Date(),
          lastSyncAt: new Date(),
          syncStatus: LinearProjectSyncStatus.idle,
          lastSyncError: stats.failed > 0 ? `${stats.failed} issue(s) failed to import` : null,
        },
      });

      if (syncRunId) {
        await this.finishRun(syncRunId, stats, stats.failed > 0);
      }

      return stats;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Import failed";
      await this.mappingService.setSyncStatus(
        projectId,
        LinearProjectSyncStatus.error,
        message,
      );
      if (syncRunId) {
        await this.prisma.linearSyncRun.update({
          where: { id: syncRunId },
          data: {
            status: LinearSyncRunStatus.failed,
            finishedAt: new Date(),
            error: message,
          },
        });
      }
      throw e;
    }
  }

  private async upsertIssueFromLinear(
    projectId: string,
    issue: LinearIssueNode,
    stateMap: Record<string, TaskStatus>,
    organizationId: string,
  ): Promise<"created" | "updated" | "skipped"> {
    const existingLink = await this.prisma.linearIssueLink.findUnique({
      where: { projectId_linearIssueId: { projectId, linearIssueId: issue.id } },
      include: { projectTask: true },
    });

    const assigneeId = await this.resolveAssigneeId(organizationId, projectId, issue);

    if (!existingLink) {
      const status = resolveTaskStatusFromLinearState(issue.state?.name, stateMap);
      const task = await this.prisma.projectTask.create({
        data: {
          projectId,
          title: issue.title,
          description: issue.description ?? null,
          status,
          priority: linearPriorityToTaskPriority(issue.priority),
          assigneeId,
          dueDate: issue.dueDate ?? null,
          labels: extractLabelNames(issue),
        },
      });

      await this.prisma.linearIssueLink.create({
        data: {
          projectId,
          projectTaskId: task.id,
          linearIssueId: issue.id,
          linearIssueIdentifier: issue.identifier ?? null,
          linearUpdatedAt: issue.updatedAt,
          localUpdatedAt: task.updatedAt,
          syncDirection: LinearSyncDirection.import,
          importedFromLinear: true,
          syncedToLinear: false,
          lastSyncedAt: new Date(),
          linearStateId: issue.state?.id ?? null,
          labelIds: issue.labels?.nodes.map((l) => l.id) ?? [],
        },
      });
      return "created";
    }

    const task = existingLink.projectTask;

    if (!shouldApplyLinearImport(task.updatedAt, issue.updatedAt, existingLink)) {
      return "skipped";
    }

    const status = resolveTaskStatusFromLinearState(issue.state?.name, stateMap);
    const updatedTask = await this.prisma.projectTask.update({
      where: { id: task.id },
      data: {
        title: issue.title,
        description: issue.description ?? null,
        status,
        priority: linearPriorityToTaskPriority(issue.priority),
        assigneeId,
        dueDate: issue.dueDate ?? null,
        labels: extractLabelNames(issue),
      },
      select: { updatedAt: true },
    });

    await this.prisma.linearIssueLink.update({
      where: { id: existingLink.id },
      data: {
        linearIssueIdentifier: issue.identifier ?? null,
        linearUpdatedAt: issue.updatedAt,
        localUpdatedAt: updatedTask.updatedAt,
        lastSyncedAt: new Date(),
        linearStateId: issue.state?.id ?? null,
        labelIds: issue.labels?.nodes.map((l) => l.id) ?? [],
        lastSyncError: null,
      },
    });

    return "updated";
  }

  private async resolveAssigneeId(
    organizationId: string,
    projectId: string,
    issue: LinearIssueNode,
  ): Promise<string | null> {
    const email = issue.assignee?.email;
    if (!email) {
      return null;
    }
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        user: { email },
      },
      select: { userId: true },
    });
    return member?.userId ?? null;
  }

  private async finishRun(syncRunId: string, stats: SyncStats, partial: boolean) {
    await this.prisma.linearSyncRun.update({
      where: { id: syncRunId },
      data: {
        status: partial ? LinearSyncRunStatus.partial : LinearSyncRunStatus.completed,
        finishedAt: new Date(),
        stats: stats as Prisma.InputJsonValue,
      },
    });
  }

  async createSyncRun(projectId: string, type: LinearSyncRunType) {
    return this.prisma.linearSyncRun.create({
      data: {
        projectId,
        type,
        status: LinearSyncRunStatus.running,
      },
    });
  }
}
