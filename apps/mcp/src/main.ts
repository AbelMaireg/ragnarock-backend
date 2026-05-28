import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { McpModule } from "./mcp.module";
import { setupMcpDocs } from "./mcp-docs";

async function bootstrap() {
  const app = await NestFactory.create(McpModule);

  // MCP requires JSON body parsing for POST requests
  app.use(json());

  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-ragnarock-key", "mcp-session-id"],
    exposedHeaders: ["mcp-session-id"],
  });

  setupMcpDocs(app);

  const port = process.env.MCP_PORT ?? 8002;
  await app.listen(port);
  console.log(`Ragnarock MCP server running on port ${port}`);
  console.log(`API docs available at http://localhost:${port}/docs`);
}

bootstrap();
