import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IntegrationConnectionStatus, IntegrationProviderKey } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { IntegrationsCredentialsService } from "../../integrations/integrations-credentials.service";

export type LinearPatCredentials = { mode: "pat"; pat: string };
export type LinearOAuthCredentials = {
  mode: "oauth2";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};
export type LinearCredentials = LinearPatCredentials | LinearOAuthCredentials;

@Injectable()
export class LinearCredentialsResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: IntegrationsCredentialsService,
    private readonly configService: ConfigService,
  ) {}

  async resolvePat(organizationId: string): Promise<string> {
    const creds = await this.resolve(organizationId);
    if (creds.mode === "pat") {
      return creds.pat;
    }
    return creds.accessToken;
  }

  async resolve(organizationId: string): Promise<LinearCredentials> {
    const fallback = this.configService.get<string>("linear.apiKey", "").trim();
    if (fallback) {
      return { mode: "pat", pat: fallback };
    }

    const row = await this.prisma.integrationConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: IntegrationProviderKey.linear,
        },
      },
    });

    if (!row || row.status !== IntegrationConnectionStatus.active) {
      throw new BadRequestException({
        message: "Linear is not connected for this organization",
        code: "LINEAR_NOT_CONNECTED",
      });
    }

    let payload: Record<string, unknown>;
    try {
      payload = this.credentials.decryptPayload(row.encryptedCredentials);
    } catch {
      throw new BadRequestException({
        message: "Could not read Linear credentials",
        code: "LINEAR_NOT_CONNECTED",
      });
    }

    if (row.authMode === "oauth2") {
      const accessToken = typeof payload.accessToken === "string" ? payload.accessToken : "";
      if (!accessToken) {
        throw new BadRequestException({
          message: "Linear OAuth token is missing",
          code: "LINEAR_NOT_CONNECTED",
        });
      }
      return {
        mode: "oauth2",
        accessToken,
        refreshToken: typeof payload.refreshToken === "string" ? payload.refreshToken : undefined,
        expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : undefined,
      };
    }

    const pat = typeof payload.pat === "string" ? payload.pat : "";
    if (!pat) {
      throw new NotFoundException({
        message: "Linear PAT is missing",
        code: "LINEAR_NOT_CONNECTED",
      });
    }
    return { mode: "pat", pat };
  }
}
