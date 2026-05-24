import { createHash } from "node:crypto";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import type { Request } from "express";

export const PROJECT_ID_KEY = "mcpProjectId";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { [PROJECT_ID_KEY]?: string }>();

    const raw =
      (request.headers["x-ragnarock-key"] as string | undefined) ??
      (request.headers["authorization"] as string | undefined)?.replace(/^Bearer\s+/i, "");

    if (!raw) throw new UnauthorizedException("Missing API key");

    const keyHash = createHash("sha256").update(raw).digest("hex");

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

    request[PROJECT_ID_KEY] = record.projectId;
    return true;
  }
}
