import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { IntegrationConnectionStatus, IntegrationProviderKey, type Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { INTEGRATION_CATALOG } from "./integration-catalog";
import { IntegrationsCredentialsService } from "./integrations-credentials.service";
import { verifyLinearPat } from "./linear-api";
import type { ConnectLinearDto } from "./dto/connect-linear.dto";

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly credentials: IntegrationsCredentialsService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.prismaService.integrationConnection.findMany({
      where: { organizationId },
      select: {
        provider: true,
        status: true,
        lastError: true,
        lastVerifiedAt: true,
        updatedAt: true,
      },
    });
    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    return {
      catalog: INTEGRATION_CATALOG,
      connections: INTEGRATION_CATALOG.map((c) => {
        const row = byProvider.get(c.provider);
        return {
          provider: c.provider,
          displayName: c.displayName,
          description: c.description,
          authModes: c.authModes,
          connectImplemented: c.connectImplemented,
          status: row?.status ?? null,
          lastError: row?.lastError ?? null,
          lastVerifiedAt: row?.lastVerifiedAt?.toISOString() ?? null,
          updatedAt: row?.updatedAt?.toISOString() ?? null,
        };
      }),
    };
  }

  async connectLinear(organizationId: string, userId: string, dto: ConnectLinearDto) {
    const pat = dto.pat.trim();
    const verified = await verifyLinearPat(pat);
    if (!verified.ok) {
      throw new BadRequestException(verified.message);
    }

    const encrypted = this.credentials.encryptPayload({ pat });

    const row = await this.prismaService.integrationConnection.upsert({
      where: {
        organizationId_provider: { organizationId, provider: IntegrationProviderKey.linear },
      },
      create: {
        organizationId,
        provider: IntegrationProviderKey.linear,
        authMode: "pat",
        status: IntegrationConnectionStatus.active,
        encryptedCredentials: encrypted,
        createdByUserId: userId,
        lastVerifiedAt: new Date(),
        lastError: null,
      },
      update: {
        encryptedCredentials: encrypted,
        status: IntegrationConnectionStatus.active,
        lastVerifiedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      },
    });

    return {
      provider: row.provider,
      status: row.status,
      lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    };
  }

  async disconnect(organizationId: string, provider: IntegrationProviderKey) {
    const existing = await this.prismaService.integrationConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
    if (!existing) {
      throw new NotFoundException("Integration is not connected");
    }
    await this.prismaService.integrationConnection.delete({
      where: { id: existing.id },
    });
    return { disconnected: true, provider };
  }

  async verify(organizationId: string, provider: IntegrationProviderKey) {
    const row = await this.prismaService.integrationConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
    if (!row) {
      throw new NotFoundException("Integration is not connected");
    }

    if (provider === IntegrationProviderKey.linear) {
      let payload: Record<string, unknown>;
      try {
        payload = this.credentials.decryptPayload(row.encryptedCredentials);
      } catch (e) {
        await this.markError(row.id, e instanceof Error ? e.message : "Decrypt failed");
        throw e;
      }
      const pat = typeof payload.pat === "string" ? payload.pat : "";
      if (!pat) {
        await this.markError(row.id, "Missing PAT in stored credentials");
        throw new BadRequestException("Missing PAT in stored credentials");
      }
      const verified = await verifyLinearPat(pat);
      if (!verified.ok) {
        await this.markError(row.id, verified.message);
        throw new BadRequestException(verified.message);
      }
      await this.prismaService.integrationConnection.update({
        where: { id: row.id },
        data: {
          status: IntegrationConnectionStatus.active,
          lastVerifiedAt: new Date(),
          lastError: null,
        },
      });
      return { ok: true as const, provider, lastVerifiedAt: new Date().toISOString() };
    }

    throw new UnprocessableEntityException("Verify is not implemented for this provider");
  }

  private async markError(id: string, message: string) {
    const data: Prisma.IntegrationConnectionUpdateInput = {
      status: IntegrationConnectionStatus.error,
      lastError: message.slice(0, 8000),
    };
    await this.prismaService.integrationConnection.update({ where: { id }, data });
  }
}
