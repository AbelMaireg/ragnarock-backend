import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LinearProjectSyncStatus, Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { LinearGraphqlService } from "./linear-graphql.service";
import { LinearCredentialsResolver } from "./linear-credentials.resolver";
import { buildStateMapFromWorkflowStates } from "../mappers/linear-field.mapper";
import { LINEAR_ERROR_CODES } from "../errors/linear-api.error";
import type { LinkLinearProjectDto } from "../dto/link-linear-project.dto";
import type { UpdateLinearSettingsDto } from "../dto/linear-settings.dto";

@Injectable()
export class LinearMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graphql: LinearGraphqlService,
    private readonly credentials: LinearCredentialsResolver,
  ) {}

  async getProjectContext(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { linearMapping: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  async getStatus(organizationId: string, projectId: string) {
    const project = await this.getProjectContext(organizationId, projectId);
    const connection = await this.prisma.integrationConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: "linear",
        },
      },
      select: { status: true, lastError: true, lastVerifiedAt: true },
    });

    return {
      linearConnected: connection?.status === "active",
      connectionStatus: connection?.status ?? null,
      connectionLastError: connection?.lastError ?? null,
      mapping: project.linearMapping
        ? {
            linearProjectId: project.linearMapping.linearProjectId,
            linearTeamId: project.linearMapping.linearTeamId,
            linearProjectName: project.linearMapping.linearProjectName,
            lastSyncAt: project.linearMapping.lastSyncAt?.toISOString() ?? null,
            lastImportAt: project.linearMapping.lastImportAt?.toISOString() ?? null,
            lastExportAt: project.linearMapping.lastExportAt?.toISOString() ?? null,
            syncStatus: project.linearMapping.syncStatus,
            lastSyncError: project.linearMapping.lastSyncError,
            autoSyncEnabled: project.linearMapping.autoSyncEnabled,
          }
        : null,
    };
  }

  async linkProject(organizationId: string, projectId: string, dto: LinkLinearProjectDto) {
    await this.getProjectContext(organizationId, projectId);
    const pat = await this.credentials.resolvePat(organizationId);

    const projects = await this.graphql.listProjects(pat, dto.linearTeamId);
    const linearProject = projects.find((p) => p.id === dto.linearProjectId);
    if (!linearProject) {
      throw new BadRequestException("Linear project not found in the selected team");
    }

    const states = await this.graphql.listWorkflowStates(pat, dto.linearTeamId);
    const stateMap = buildStateMapFromWorkflowStates(states);
    const defaultState =
      states.find((s) => s.name.toLowerCase() === "todo") ??
      states.find((s) => s.type === "unstarted") ??
      states[0];

    const mapping = await this.prisma.linearProjectMapping.upsert({
      where: { projectId },
      create: {
        projectId,
        linearProjectId: dto.linearProjectId,
        linearTeamId: dto.linearTeamId,
        linearProjectName: linearProject.name,
        defaultLinearStateId: defaultState?.id,
        stateMap: stateMap as Prisma.InputJsonValue,
        syncStatus: LinearProjectSyncStatus.idle,
        lastSyncError: null,
      },
      update: {
        linearProjectId: dto.linearProjectId,
        linearTeamId: dto.linearTeamId,
        linearProjectName: linearProject.name,
        defaultLinearStateId: defaultState?.id,
        stateMap: stateMap as Prisma.InputJsonValue,
        syncStatus: LinearProjectSyncStatus.idle,
        lastSyncError: null,
      },
    });

    return {
      linearProjectId: mapping.linearProjectId,
      linearTeamId: mapping.linearTeamId,
      linearProjectName: mapping.linearProjectName,
    };
  }

  async unlinkProject(organizationId: string, projectId: string) {
    await this.getProjectContext(organizationId, projectId);
    const mapping = await this.prisma.linearProjectMapping.findUnique({
      where: { projectId },
    });
    if (!mapping) {
      throw new NotFoundException({
        message: "Project is not linked to Linear",
        code: LINEAR_ERROR_CODES.NOT_LINKED,
      });
    }

    await this.prisma.$transaction([
      this.prisma.linearIssueLink.deleteMany({ where: { projectId } }),
      this.prisma.linearProjectMapping.delete({ where: { projectId } }),
    ]);

    return { unlinked: true };
  }

  async updateSettings(organizationId: string, projectId: string, dto: UpdateLinearSettingsDto) {
    const project = await this.getProjectContext(organizationId, projectId);
    if (!project.linearMapping) {
      throw new NotFoundException({
        message: "Project is not linked to Linear",
        code: LINEAR_ERROR_CODES.NOT_LINKED,
      });
    }

    const data: Prisma.LinearProjectMappingUpdateInput = {};
    if (dto.autoSyncEnabled !== undefined) {
      data.autoSyncEnabled = dto.autoSyncEnabled;
    }
    if (dto.stateMap !== undefined) {
      data.stateMap = dto.stateMap as Prisma.InputJsonValue;
    }
    if (dto.defaultLinearStateId !== undefined) {
      data.defaultLinearStateId = dto.defaultLinearStateId;
    }

    const updated = await this.prisma.linearProjectMapping.update({
      where: { projectId },
      data,
    });

    return {
      autoSyncEnabled: updated.autoSyncEnabled,
      defaultLinearStateId: updated.defaultLinearStateId,
    };
  }

  async requireMapping(organizationId: string, projectId: string) {
    const project = await this.getProjectContext(organizationId, projectId);
    if (!project.linearMapping) {
      throw new BadRequestException({
        message: "Link a Linear project before syncing",
        code: LINEAR_ERROR_CODES.NOT_LINKED,
      });
    }
    if (project.linearMapping.syncStatus === LinearProjectSyncStatus.syncing) {
      throw new ConflictException({
        message: "A sync is already in progress",
        code: LINEAR_ERROR_CODES.SYNC_IN_PROGRESS,
      });
    }
    return project.linearMapping;
  }

  async setSyncStatus(projectId: string, status: LinearProjectSyncStatus, error?: string | null) {
    await this.prisma.linearProjectMapping.update({
      where: { projectId },
      data: {
        syncStatus: status,
        lastSyncError: error ?? null,
      },
    });
  }
}
