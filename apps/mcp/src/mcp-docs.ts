import type { INestApplication } from "@nestjs/common";
import { apiReference } from "@scalar/nestjs-api-reference";

const TOOLS_OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Ragnarock MCP Server",
    description: `
## Overview

The Ragnarock MCP server exposes your project's SDLC data as **Model Context Protocol (MCP) tools** that coding agents (Claude Code, Cursor, Windsurf) can call at runtime.

All requests hit a single endpoint using the **MCP Streamable HTTP transport**. Authentication is via a project-scoped API key — each key grants access only to the project it was created for.

## Authentication

Include the API key in every request using either header:

\`\`\`
x-ragnarock-key: ragnarock_mcp_<your-key>
\`\`\`

or as a Bearer token:

\`\`\`
Authorization: Bearer ragnarock_mcp_<your-key>
\`\`\`

Generate keys from **Project → Settings → MCP API keys** in the Ragnarock dashboard.

## Connecting to Claude Code

Add this to \`.claude/settings.json\` in your coding project:

\`\`\`json
{
  "mcpServers": {
    "ragnarock": {
      "type": "http",
      "url": "http://localhost:3002/mcp",
      "headers": {
        "x-ragnarock-key": "ragnarock_mcp_<your-key>"
      }
    }
  }
}
\`\`\`

Once connected, Claude Code will automatically discover all 7 tools and can call them during its work — reading requirements before writing code, marking tasks done after opening a PR, checking test cases before writing tests.

## Connecting to Cursor

Add this to your Cursor MCP settings (\`.cursor/mcp.json\`):

\`\`\`json
{
  "mcpServers": {
    "ragnarock": {
      "url": "http://localhost:3002/mcp",
      "headers": {
        "x-ragnarock-key": "ragnarock_mcp_<your-key>"
      }
    }
  }
}
\`\`\`

## Why you can't use the "Try it" button here

The MCP Streamable HTTP transport requires every request to include:

\`\`\`
Accept: text/event-stream
\`\`\`

Browser clients — including Scalar's built-in "Try it" panel — send \`Accept: application/json\` and will get a \`406 Not Acceptable\` response. This is by design in the MCP spec; the server streams responses as Server-Sent Events (SSE), not plain JSON.

The tool sections below are a **reference only** — they show the JSON-RPC shape of each request and response so you know what to expect, but they cannot be executed from this page.

## Testing without a coding agent

**Option 1 — MCP Inspector (recommended)**

The official interactive tool for testing MCP servers:

\`\`\`bash
npx @modelcontextprotocol/inspector http://localhost:3002/mcp
\`\`\`

Opens at \`http://localhost:5173\`. Add your API key under **Headers → x-ragnarock-key**, then browse tools, fill arguments, and see live responses.

**Option 2 — curl**

Pass \`Accept: text/event-stream\` and you'll get the SSE stream back in the terminal:

\`\`\`bash
# List all available tools
curl -X POST http://localhost:3002/mcp \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -H "x-ragnarock-key: ragnarock_mcp_<your-key>" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Call a specific tool
curl -X POST http://localhost:3002/mcp \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -H "x-ragnarock-key: ragnarock_mcp_<your-key>" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_next_task","arguments":{}}}'
\`\`\`

## Available Tools

| Tool | Description |
|------|-------------|
| \`get_srs\` | Full Software Requirements Specification |
| \`get_features\` | Product features with requirements and counts |
| \`get_next_task\` | Highest-priority pending task |
| \`get_task_detail\` | Full detail for a specific task |
| \`mark_task_complete\` | Mark a task done, get the next one back |
| \`get_test_cases\` | Test cases for a feature |
| \`get_architecture_docs\` | AI-generated architecture documents (SAD/HLD/LLD) |
    `.trim(),
    version: "1.0.0",
    contact: {
      name: "Ragnarock",
    },
  },
  servers: [
    {
      url: "http://localhost:3002",
      description: "Local MCP server",
    },
  ],
  security: [{ ApiKeyHeader: [] }],
  components: {
    securitySchemes: {
      ApiKeyHeader: {
        type: "apiKey",
        in: "header",
        name: "x-ragnarock-key",
        description: "Project-scoped API key. Generate from Project → Settings → MCP API keys.",
      },
    },
    schemas: {
      McpRequest: {
        type: "object",
        required: ["jsonrpc", "method"],
        properties: {
          jsonrpc: { type: "string", enum: ["2.0"], example: "2.0" },
          id: { type: ["string", "number"], example: 1 },
          method: {
            type: "string",
            enum: ["tools/list", "tools/call"],
            example: "tools/call",
          },
          params: { type: "object" },
        },
      },
      McpResponse: {
        type: "object",
        properties: {
          jsonrpc: { type: "string", example: "2.0" },
          id: { type: ["string", "number"], example: 1 },
          result: { type: "object" },
          error: {
            type: "object",
            properties: {
              code: { type: "number" },
              message: { type: "string" },
            },
          },
        },
      },
      ToolsListRequest: {
        allOf: [
          { $ref: "#/components/schemas/McpRequest" },
          {
            properties: {
              method: { type: "string", enum: ["tools/list"], example: "tools/list" },
            },
          },
        ],
      },
      GetSrsRequest: {
        allOf: [
          { $ref: "#/components/schemas/McpRequest" },
          {
            example: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: { name: "get_srs", arguments: {} },
            },
          },
        ],
      },
      GetFeaturesRequest: {
        allOf: [
          { $ref: "#/components/schemas/McpRequest" },
          {
            example: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: { name: "get_features", arguments: {} },
            },
          },
        ],
      },
      GetNextTaskRequest: {
        allOf: [
          { $ref: "#/components/schemas/McpRequest" },
          {
            example: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: { name: "get_next_task", arguments: {} },
            },
          },
        ],
      },
      GetTaskDetailRequest: {
        allOf: [
          { $ref: "#/components/schemas/McpRequest" },
          {
            example: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: {
                name: "get_task_detail",
                arguments: { taskId: "clxyz123" },
              },
            },
          },
        ],
      },
      MarkTaskCompleteRequest: {
        allOf: [
          { $ref: "#/components/schemas/McpRequest" },
          {
            example: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: {
                name: "mark_task_complete",
                arguments: {
                  taskId: "clxyz123",
                  prUrl: "https://github.com/org/repo/pull/42",
                },
              },
            },
          },
        ],
      },
      GetTestCasesRequest: {
        allOf: [
          { $ref: "#/components/schemas/McpRequest" },
          {
            example: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: {
                name: "get_test_cases",
                arguments: { featureId: "feat_001" },
              },
            },
          },
        ],
      },
      GetArchitectureDocsRequest: {
        allOf: [
          { $ref: "#/components/schemas/McpRequest" },
          {
            example: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: { name: "get_architecture_docs", arguments: {} },
            },
          },
        ],
      },
    },
  },
  paths: {
    "/mcp": {
      post: {
        tags: ["MCP Transport"],
        summary: "MCP Streamable HTTP endpoint",
        description: `Single endpoint for all MCP communication. Supports \`tools/list\` and \`tools/call\` methods via JSON-RPC 2.0.\n\n> ⚠️ **Cannot be called from this UI.** The MCP transport requires \`Accept: text/event-stream\` — requests from browser clients (including Scalar's "Try it") will return \`406 Not Acceptable\`. Use an MCP client (Claude Code, Cursor) instead.\n\nSee the tool-specific sections below for per-tool request shapes.`,
        security: [{ ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/McpRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "JSON-RPC response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/McpResponse" },
              },
            },
          },
          "401": { description: "Missing or invalid API key" },
          "500": { description: "Internal server error" },
        },
      },
      get: {
        tags: ["MCP Transport"],
        summary: "MCP SSE stream (GET)",
        description: "Opens a Server-Sent Events stream for server-initiated notifications. Used by stateful MCP clients.",
        security: [{ ApiKeyHeader: [] }],
        responses: {
          "200": { description: "SSE stream opened" },
          "401": { description: "Missing or invalid API key" },
        },
      },
    },
    "/mcp#get_srs": {
      post: {
        tags: ["Tools"],
        summary: "get_srs — Full SRS document",
        description:
          "Returns the complete Software Requirements Specification for the project, including features, functional requirements, non-functional requirements, user stories, and acceptance criteria.\n\nRead this first to understand what the project is supposed to do before writing any code.",
        security: [{ ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetSrsRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "SRS document as JSON",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/McpResponse",
                },
                example: {
                  jsonrpc: "2.0",
                  id: 1,
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            title: "Ragnarock SRS v1",
                            updatedAt: "2026-05-01T00:00:00Z",
                            features: [{ featureId: "feat_001", name: "User auth", description: "..." }],
                            functional_requirements: ["Users can sign up with email"],
                            non_functional_requirements: ["P99 latency < 200ms"],
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/mcp#get_features": {
      post: {
        tags: ["Tools"],
        summary: "get_features — List features",
        description:
          "Lists all product features with their requirements, task counts, and test case counts.\n\nUse the `id` field (e.g. `feat_001`) as input to `get_test_cases`.",
        security: [{ ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetFeaturesRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Feature list",
            content: {
              "application/json": {
                example: {
                  jsonrpc: "2.0",
                  id: 1,
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          [
                            {
                              id: "feat_001",
                              name: "User Authentication",
                              description: "Sign up, login, password reset",
                              taskCount: 4,
                              testCaseCount: 6,
                              requirementCount: 3,
                              requirements: [{ id: "fr_001", title: "Email sign-up", status: "approved" }],
                            },
                          ],
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/mcp#get_next_task": {
      post: {
        tags: ["Tools"],
        summary: "get_next_task — Next pending task",
        description:
          "Returns the highest-priority task with status `backlog`, `todo`, or `in_progress`, ordered by sort order.\n\nStart here when picking up work. Use the returned `id` with `get_task_detail` or `mark_task_complete`.",
        security: [{ ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetNextTaskRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Next task or completion message",
            content: {
              "application/json": {
                example: {
                  jsonrpc: "2.0",
                  id: 1,
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            id: "clxyz123",
                            title: "Implement JWT refresh token",
                            description: "Use httpOnly cookie, 7-day expiry",
                            priority: "high",
                            phase: "backend",
                            status: "todo",
                            featureId: "feat_001",
                            featureName: "User Authentication",
                            labels: [],
                            sortOrder: 1,
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/mcp#get_task_detail": {
      post: {
        tags: ["Tools"],
        summary: "get_task_detail — Full task detail",
        description:
          "Returns full detail for a specific task including its linked feature and all associated requirements.\n\n**Input:** `taskId` (string) — the `id` from `get_next_task`.",
        security: [{ ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetTaskDetailRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Task detail with feature and requirements" },
          "401": { description: "Unauthorized" },
          "404": { description: "Task not found" },
        },
      },
    },
    "/mcp#mark_task_complete": {
      post: {
        tags: ["Tools"],
        summary: "mark_task_complete — Complete a task",
        description:
          "Marks a task as `done`. Optionally attach a PR URL — it will be stored as a label on the task.\n\nReturns the next pending task so you can continue without an extra `get_next_task` call.\n\n**Input:**\n- `taskId` (string, required) — task to complete\n- `prUrl` (string, optional) — pull request URL",
        security: [{ ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MarkTaskCompleteRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Completion confirmation and next task",
            content: {
              "application/json": {
                example: {
                  jsonrpc: "2.0",
                  id: 1,
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            taskId: "clxyz123",
                            status: "done",
                            nextTask: {
                              id: "clxyz456",
                              title: "Add email verification flow",
                              status: "todo",
                            },
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Task not found" },
        },
      },
    },
    "/mcp#get_test_cases": {
      post: {
        tags: ["Tools"],
        summary: "get_test_cases — Test cases for a feature",
        description:
          "Returns all test cases for a specific feature (unit, integration, e2e).\n\n**Input:** `featureId` (string) — feature external ID from `get_features` (e.g. `feat_001`).",
        security: [{ ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetTestCasesRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Test cases for the feature",
            content: {
              "application/json": {
                example: {
                  jsonrpc: "2.0",
                  id: 1,
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            featureId: "feat_001",
                            featureName: "User Authentication",
                            testCases: [
                              {
                                id: "tc_001",
                                title: "Valid login returns JWT",
                                type: "integration",
                                preconditions: "User exists in DB",
                                steps: "POST /auth/login with valid credentials",
                                expectedResult: "200 with access_token and refresh cookie",
                              },
                            ],
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/mcp#get_architecture_docs": {
      post: {
        tags: ["Tools"],
        summary: "get_architecture_docs — Architecture documents",
        description:
          "Returns all AI-generated architecture documents (SAD, HLD, LLD) with full markdown content.\n\nRead these before implementing to understand the intended system design, technology choices, and component structure.",
        security: [{ ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetArchitectureDocsRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Architecture documents list",
            content: {
              "application/json": {
                example: {
                  jsonrpc: "2.0",
                  id: 1,
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          [
                            {
                              id: "cldoc123",
                              title: "Software Architecture Document",
                              type: "sad",
                              status: "published",
                              content: "# SAD\n\n## Overview\n...",
                              updatedAt: "2026-05-01T00:00:00Z",
                            },
                          ],
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
  },
  tags: [
    {
      name: "MCP Transport",
      description: "The underlying HTTP transport endpoint. All tool calls go through `POST /mcp`.\n\n**Note:** This endpoint cannot be tested from this UI — it requires `Accept: text/event-stream` which browser clients do not send. Connect via Claude Code or another MCP client.",
    },
    {
      name: "Tools",
      description:
        "The 7 MCP tools exposed by this server. Each section shows the JSON-RPC request shape and example response.",
    },
  ],
};

export function setupMcpDocs(app: INestApplication): void {
  app.use(
    "/docs/openapi.json",
    (_req: any, res: any) => {
      res.json(TOOLS_OPENAPI_SPEC);
    },
  );

  app.use(
    "/docs",
    apiReference({
      url: "/docs/openapi.json",
    }),
  );
}
