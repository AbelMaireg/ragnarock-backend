import { Module } from "@nestjs/common";
import { AppConfigModule } from "@app/config";
import { PrismaModule } from "@app/prisma";
import { ApiKeyGuard } from "./auth/api-key.guard";
import { McpController } from "./mcp.controller";
import { McpServerService } from "./mcp.server";
import { SrsTool } from "./tools/srs.tool";
import { FeaturesTool } from "./tools/features.tool";
import { TasksTool } from "./tools/tasks.tool";
import { TestCasesTool } from "./tools/test-cases.tool";
import { ArchitectureTool } from "./tools/architecture.tool";

@Module({
  imports: [AppConfigModule, PrismaModule],
  controllers: [McpController],
  providers: [
    ApiKeyGuard,
    McpServerService,
    SrsTool,
    FeaturesTool,
    TasksTool,
    TestCasesTool,
    ArchitectureTool,
  ],
})
export class McpModule {}
