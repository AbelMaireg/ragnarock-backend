import { Injectable, Logger } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SrsTool } from "./tools/srs.tool";
import { FeaturesTool } from "./tools/features.tool";
import { TasksTool } from "./tools/tasks.tool";
import { TestCasesTool } from "./tools/test-cases.tool";
import { ArchitectureTool } from "./tools/architecture.tool";

@Injectable()
export class McpServerService {
  private readonly logger = new Logger(McpServerService.name);

  constructor(
    private readonly srs: SrsTool,
    private readonly features: FeaturesTool,
    private readonly tasks: TasksTool,
    private readonly testCases: TestCasesTool,
    private readonly architecture: ArchitectureTool,
  ) {}

  /** Creates a fresh McpServer bound to a specific projectId for one request lifecycle. */
  createForProject(projectId: string): McpServer {
    const server = new McpServer({ name: "ragnarock", version: "1.0.0" });

    server.registerTool(
      "get_srs",
      {
        title: "Get SRS",
        description:
          "Returns the full Software Requirements Specification (SRS) document for this project, including all features, functional, and non-functional requirements.",
        inputSchema: z.object({}),
      },
      async () => {
        const result = await this.srs.getProjectSrs(projectId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.registerTool(
      "get_features",
      {
        title: "Get Features",
        description:
          "Lists all product features with their requirements, task counts, and test case counts. Use feature IDs from this list as input to get_test_cases.",
        inputSchema: z.object({}),
      },
      async () => {
        const result = await this.features.getFeatures(projectId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.registerTool(
      "get_next_task",
      {
        title: "Get Next Task",
        description:
          "Returns the highest-priority pending task (backlog/todo/in_progress), ordered by sort order. Start here when picking up work.",
        inputSchema: z.object({}),
      },
      async () => {
        const result = await this.tasks.getNextTask(projectId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.registerTool(
      "get_task_detail",
      {
        title: "Get Task Detail",
        description:
          "Returns full detail for a specific task, including its linked feature and all associated requirements. Use the task id from get_next_task.",
        inputSchema: z.object({
          taskId: z.string().describe("The task ID from get_next_task"),
        }),
      },
      async ({ taskId }) => {
        const result = await this.tasks.getTaskDetail(projectId, taskId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.registerTool(
      "mark_task_complete",
      {
        title: "Mark Task Complete",
        description:
          "Marks a task as done. Optionally attach the PR URL. Returns the next pending task so you can continue without an extra get_next_task call.",
        inputSchema: z.object({
          taskId: z.string().describe("The task ID to mark as complete"),
          prUrl: z.string().optional().describe("Optional pull request URL to attach to this task"),
        }),
      },
      async ({ taskId, prUrl }) => {
        const result = await this.tasks.markTaskComplete(projectId, taskId, prUrl);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.registerTool(
      "get_test_cases",
      {
        title: "Get Test Cases",
        description:
          "Returns all test cases for a specific feature (unit, integration, e2e). Use feature IDs from get_features (e.g. feat_001).",
        inputSchema: z.object({
          featureId: z
            .string()
            .describe("The feature external ID (e.g. feat_001) from get_features"),
        }),
      },
      async ({ featureId }) => {
        const result = await this.testCases.getTestCases(projectId, featureId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.registerTool(
      "get_architecture_docs",
      {
        title: "Get Architecture Docs",
        description:
          "Returns all AI-generated architecture documents (SAD, HLD, LLD) with full markdown content. Read these before implementing to understand the intended design.",
        inputSchema: z.object({}),
      },
      async () => {
        const result = await this.architecture.getArchitectureDocs(projectId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    this.logger.debug(`MCP server created for project ${projectId}`);
    return server;
  }
}
