import { createHash, randomBytes } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "@app/prisma";

export type CreatedApiKey = {
  id: string;
  name: string;
  projectId: string;
  rawToken: string;
  createdAt: Date;
  expiresAt: Date | null;
};

export type ApiKeyListItem = {
  id: string;
  name: string;
  projectId: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawToken(): string {
  return `ragnarock_mcp_${randomBytes(32).toString("hex")}`;
}

@Injectable()
export class ProjectApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    projectId: string;
    organizationId: string;
    userId: string;
    name: string;
    expiresAt?: Date;
  }): Promise<CreatedApiKey> {
    await this.ensureProjectAccess(params.projectId, params.organizationId);

    const existing = await this.prisma.projectApiKey.findFirst({
      where: { projectId: params.projectId, name: params.name },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `An API key named "${params.name}" already exists for this project.`,
      );
    }

    const rawToken = generateRawToken();
    const keyHash = hashToken(rawToken);

    const record = await this.prisma.projectApiKey.create({
      data: {
        projectId: params.projectId,
        name: params.name,
        keyHash,
        createdBy: params.userId,
        expiresAt: params.expiresAt ?? null,
      },
    });

    return {
      id: record.id,
      name: record.name,
      projectId: record.projectId,
      rawToken,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }

  async list(projectId: string, organizationId: string): Promise<ApiKeyListItem[]> {
    await this.ensureProjectAccess(projectId, organizationId);

    const keys = await this.prisma.projectApiKey.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        projectId: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return keys;
  }

  async revoke(params: {
    projectId: string;
    organizationId: string;
    keyId: string;
  }): Promise<void> {
    await this.ensureProjectAccess(params.projectId, params.organizationId);

    const key = await this.prisma.projectApiKey.findFirst({
      where: { id: params.keyId, projectId: params.projectId },
      select: { id: true },
    });
    if (!key) throw new NotFoundException("API key not found");

    await this.prisma.projectApiKey.delete({ where: { id: params.keyId } });
  }

  /** Called by the MCP server on every tool call. Returns projectId or throws. */
  async verifyAndResolve(rawToken: string): Promise<string> {
    const keyHash = hashToken(rawToken);

    const record = await this.prisma.projectApiKey.findUnique({
      where: { keyHash },
      select: { id: true, projectId: true, expiresAt: true },
    });

    if (!record) throw new UnauthorizedException("Invalid API key");

    if (record.expiresAt && record.expiresAt < new Date()) {
      throw new UnauthorizedException("API key has expired");
    }

    await this.prisma.projectApiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return record.projectId;
  }

  private async ensureProjectAccess(projectId: string, organizationId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) throw new ForbiddenException("Project not found");
  }
}
