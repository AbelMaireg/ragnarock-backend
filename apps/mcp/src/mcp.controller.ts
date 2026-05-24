import { All, Controller, Logger, Req, Res, UseGuards } from "@nestjs/common";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { ApiKeyGuard, PROJECT_ID_KEY } from "./auth/api-key.guard";
import { McpServerService } from "./mcp.server";

@Controller("mcp")
@UseGuards(ApiKeyGuard)
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpServer: McpServerService) {}

  @All()
  async handle(@Req() req: Request & { [PROJECT_ID_KEY]?: string }, @Res() res: Response) {
    const projectId = req[PROJECT_ID_KEY];
    if (!projectId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Stateless: one transport + one MCP server instance per request
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const server = this.mcpServer.createForProject(projectId);

    try {
      await server.connect(transport);
      await transport.handleRequest(req as any, res as any, req.body);
    } catch (err) {
      this.logger.error("MCP transport error", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    } finally {
      await server.close().catch(() => {});
    }
  }
}
