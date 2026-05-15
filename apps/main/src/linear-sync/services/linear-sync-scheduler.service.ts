import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { LinearProjectSyncStatus } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { LinearSyncService } from "./linear-sync.service";

@Injectable()
export class LinearSyncSchedulerService {
  private readonly logger = new Logger(LinearSyncSchedulerService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: LinearSyncService,
    configService: ConfigService,
  ) {
    this.enabled = configService.get<boolean>("linear.syncEnabled", false);
  }

  @Cron(process.env.LINEAR_SYNC_CRON ?? "*/15 * * * *")
  async runScheduledSync(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const mappings = await this.prisma.linearProjectMapping.findMany({
      where: {
        autoSyncEnabled: true,
        syncStatus: { not: LinearProjectSyncStatus.syncing },
      },
      include: { project: { select: { organizationId: true } } },
      take: 50,
    });

    for (const mapping of mappings) {
      try {
        await this.syncService.sync(mapping.project.organizationId, mapping.projectId);
        this.logger.log(`Scheduled Linear sync completed for project ${mapping.projectId}`);
      } catch (e) {
        this.logger.warn(
          `Scheduled Linear sync failed for project ${mapping.projectId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }
}
