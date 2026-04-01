import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  getHello(): string {
    return "Hello World!";
  }

  async testDbConnection(): Promise<{ status: "ok" }> {
    await (this.prismaService as any).$queryRawUnsafe("SELECT 1");
    return { status: "ok" };
  }
}
